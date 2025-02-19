
// allow to proxy
// allow to run any number of scripts
// javascript, go, lexiscript
// handle logins etc
// polling proxy is other idea
// directory needs a file called .one_server for it to work
// cgi
// http-based initially, we can build rpc on top of that
/*
hub and clients
hub is solely for http connectivity
clients poll the hub
clients can register a subdomain
    and/or path prefix
clients are basically just running cgi
hub can create, update, delete files on server
    list directories etc
    run shell scripts
and then run cgi scripts
inter-process locking?


It can proxy by hostname or a path.
It can keep or clear the path.
It has "satellites" that can sit on other servers, poll it for requests and either respond, or also proxy to local http server.
cgi?! (edited)
it can handle all things ssh?!
what about performance, extra hops? the satellites can run arbitrary scripts statellites have a cgi-bin directory and anything there can be run as cgi
all http for now
redis model where you run scripts against an existing server (aka already running program)
idea start with just a cgi server implement the whole thing in linescript with just file locks and filesystem. Then add more perf later

fastcgi?

another flow, it can ssh to a server and
execute command

*/

package main

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"linescript4"
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
	return "_." + parts[1]
}

func (r *CertificateReloader) getWildcardCertificate(clientHello *tls.ClientHelloInfo) (*tls.Certificate, error) {
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

	certFile := filepath.Join("certs", wildcardDomain, "fullchain.pem")
	keyFile := filepath.Join("certs", wildcardDomain, "privkey.pem")

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

	certFile := filepath.Join("certs", clientHello.ServerName, "fullchain.pem")
	keyFile := filepath.Join("certs", clientHello.ServerName, "privkey.pem")

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

func executeCGI(scriptPath string, env []string, stdin io.Reader, w http.ResponseWriter) error {
	cmd := exec.Command(scriptPath)
	cmd.Env = env
	cmd.Stdin = stdin

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	if err := cmd.Start(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	// Copy script output to the response writer
	if _, err := io.Copy(w, stdout); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return err
	}

	if err := cmd.Wait(); err != nil {
		http.Error(w, stderr.String(), http.StatusInternalServerError)
		return err
	}

	return nil
}

func cgiHandler(w http.ResponseWriter, r *http.Request) {
	scriptPath := filepath.Clean("." + r.URL.Path)
	
	env := os.Environ()
	env = append(env,
		"REQUEST_METHOD="+r.Method,
		"SCRIPT_NAME="+r.URL.Path,
		"QUERY_STRING="+r.URL.RawQuery,
		"CONTENT_TYPE="+r.Header.Get("Content-Type"),
		"CONTENT_LENGTH="+r.Header.Get("Content-Length"),
	)

	if err := executeCGI("index", env, r.Body, w); err != nil {
		log.Printf("Error executing CGI script: %v", err)
	}
}

// aren't there a bunch more headers that need to
// be sent as part of cgi spec?

func main() {
	// optional eval script
	if len(os.Args) >= 2 {
		fileName := os.Args[1]
		data, err := os.ReadFile(fileName)
		if err != nil {
			fmt.Println("Error reading file:", err)
			return
		}
		code := string(data)
		// fmt.Println(code)
		// TODO: init caches here?
		state := makeState(fileName, code)
		Eval(state)
	}
	
	reloader := &CertificateReloader{}

	http.HandleFunc("/", cgiHandler)

	http.HandleFunc("/__clearcache", func(w http.ResponseWriter, r *http.Request) {
		reloader.ClearCache()
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Certificate cache cleared")
	})

    if os.Getenv("HTTPS") != "" {
		server := &http.Server{
			Addr: os.Getenv("HTTPS"), // :443
			TLSConfig: &tls.Config{
				GetCertificate: reloader.GetCertificate,
			},
		}
		log.Println("Starting HTTPS server on", os.Getenv("HTTPS"))
		go log.Fatal(server.ListenAndServeTLS("", "")) // Certificates are loaded dynamically, based on the hostname
    }
    if os.Getenv("HTTP") != "" {
		server := &http.Server{
			Addr: os.Getenv("HTTP"), // :80
		}
		log.Println("Starting HTTPS server on", os.Getenv("HTTP"))
		go log.Fatal(server.ListenAndServeTLS("", "")) // Certificates are loaded dynamically, based on the hostname
    }

}


