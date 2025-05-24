

// make a go program that runs 2 http severs
// one that is a "config" server on 50123 (http)
// 
// the other that is like the "main" https server
// 
// the certs for the main server
// are configured

package main

import (
    "crypto/tls"
    "fmt"
    "log"
    "net/http"
    "strings"
    "os"
    "path/filepath"
    "sync"
)

type CertificateReloader struct {
	mu    sync.RWMutex
	certs map[string]*tls.Certificate
}

func formatWildcardDomain(domain string) string {
	parts := strings.SplitN(domain, ".", 2)
	if len(parts) != 2 {
		return ""
	}
	// return "_." + parts[1]
	fmt.Println("wildcard domain", parts[1])
	return parts[1]
}


func (r *CertificateReloader) getWildcardCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	// Ensure the "certs" directory exists.
	wildcardDomain := formatWildcardDomain(clientHello.ServerName)
	if wildcardDomain == "" {
		return nil, fmt.Errorf("invalid server name: %s", clientHello.ServerName)
	}

	r.mu.RLock()
	cert, ok := r.certs[wildcardDomain]
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}

	certFile := filepath.Join("/etc/letsencrypt/live/", wildcardDomain, "fullchain.pem")
	keyFile := filepath.Join("/etc/letsencrypt/live/", wildcardDomain, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("no certificate found for host: %s or wildcard domain: %s", clientHello.ServerName, wildcardDomain)
	}

	err := r.LoadCertificate(wildcardDomain, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[wildcardDomain], nil
}

func (r *CertificateReloader) GetCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
	r.mu.RLock()
	cert, ok := r.certs[clientHello.ServerName]
	if !ok {
		wildcardDomain := formatWildcardDomain(clientHello.ServerName)
		if wildcardDomain != "" {
			cert, ok = r.certs[wildcardDomain]
		}
	}
	r.mu.RUnlock()
	if ok {
		return cert, nil
	}
    fmt.Println("the server name: ", clientHello.ServerName)
	certFile := filepath.Join("/etc/letsencrypt/live/", clientHello.ServerName, "fullchain.pem")
	keyFile := filepath.Join("/etc/letsencrypt/live/", clientHello.ServerName, "privkey.pem")

	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return r.getWildcardCertificate(clientHello)
	}

	err := r.LoadCertificate(clientHello.ServerName, certFile, keyFile)
	if err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.certs[clientHello.ServerName], nil
}

func (r *CertificateReloader) LoadCertificate(hostname string, certFile, keyFile string) error {
	fmt.Println("loading cert...")
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return fmt.Errorf("could not load certificate for host %s: %v", hostname, err)
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.certs == nil {
		r.certs = make(map[string]*tls.Certificate)
	}
	r.certs[hostname] = &cert
	return nil
}

func (r *CertificateReloader) ClearCache() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.certs = make(map[string]*tls.Certificate)
}

// tcp tunnel over http
var httpsAddr = ":443"
func main() {
	reloader := &CertificateReloader{}
    mux := http.NewServeMux()
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello, world!")
    })
    server := &http.Server{
    	Addr: httpsAddr, // :443
    	TLSConfig: &tls.Config{
    		GetCertificate: reloader.GetCertificate,
    	},
    	Handler: mux,
    }
    fmt.Println("listening...")
    if err := server.ListenAndServeTLS("", ""); err != nil {
        log.Fatal(err)
    }
}



// func main() {
//     // 1) create your mux and add a handler
// 
//     // 2) plug the mux into your server
//     server := &http.Server{
//         Addr:      ":443",
//         Handler:   mux,
//         TLSConfig: &tls.Config{GetCertificate: reloader.GetCertificate},
//     }
// 
//     log.Printf("Starting HTTPS server on %s …", server.Addr)
//     // 3) pass empty strings because GetCertificate supplies certs dynamically
// }
