package main

import (
    "net/http"
    "log"
    "strings"
)

// client types, 
// cgi
// linrary to existing go code
//    don't need to ListenAndServe
//    just call this library

// server
// allow it also to be a regular proxy


type Request struct {
	RequestID string
	Method    string
	URL       string
	Header    map[string][]string
	Body      []byte
}


type Response struct {
	PollerName string
	RequestID  string
	StatusCode int
	Header     map[string][]string
	Body       []byte
}
write a Go function that will, given that response
make the appropriate calls on w (an http.ResponseWriter)
to send the response to the client


// type Sync struct {
//     mu sync.Mutex
// }
// 
// sync.Run()



type PollerProxyServer struct {
    PollerMu sync.Mutex
    PollerRequestID int
    // PollerCond *sync.Cond
	Requests map[string][]*Request
	Responses map[string]*Response
}

func NewPollerProxyServer() {
	pps := &PollerProxyServer{
	    Requests: map[string][]*Request{}
	    Responses: map[string][]*Response{}
	}
    // pps.PollerCond = sync.NewCond(&pps.PollerMu)
	return pps
}
func (p *PollerProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	pollerMux := http.NewServeMux()

	pollerMux.HandleFunc("/pollerProxy/provideResponse", func(w http.ResponseWriter, r *http.Request) {
	})
	pollerMux.HandleFunc("/pollerProxy/pollForRequests", func(w http.ResponseWriter, r *http.Request) {
		pathPrefix := r.FormValue("poller_name")
	}
	pollerMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})
	handlerMux = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// the pollers must have this header or else
		pollerName := r.Header.Get("X-Poller-Key")
		if pollerName == "" {
			pollerMux.ServeHTTP(w, r)
			return
		}
	}
		
		response := pps.WaitForResponse()
		if response == nil {
			w.WriteHeader(504)
			fmt.Fprintf(w, "%s", "{}")
			return
		}
		// Set the status code
		w.WriteHeader(resp.StatusCode)
 
		// Set the headers
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		// Write the body
		w.Write(resp.Body)
}


// either subdomain, or path prefix

func waitFor(time.Duration, f func() bool) {
    
}




func OldMain() {
	pollerPairsString := os.getEnv("POLLER_PAIRS")
	strings.Replace(pollerPairsString, ",","\n", -1)
	pairs := strings.Split(pollerPairs, "\n")
	
	
	// 📖📖📖📖📖📖📖📖📖📖📖📖

	go func() {
		for range time.NewTicker(1 * time.Second).C {
			pollerCond.Broadcast()
		}
	}()

	pollerMux := http.NewServeMux()

	pollerMux.HandleFunc("/pollerProxy/provideResponse", func(w http.ResponseWriter, r *http.Request) {
	})
	pollerMux.HandleFunc("/pollerProxy/pollForRequests", func(w http.ResponseWriter, r *http.Request) {
		pathPrefix := r.FormValue("poller_name")
	}
 
		
		// pollerMu.Lock()
		// defer pollerMu.Unlock()
		// startWait := time.Now()
		// var requests = []*request{}
		// for {
		// 	if time.Since(startWait) > (10 * time.Second) {
		// 		fmt.Fprintf(w, "%s", "{}")
		// 		return
		// 	}
		// 	requests = requestsForPolling[pathPrefix]
		// 	if len(requests) > 0 {
		// 		break
		// 	}
		// 	pollerCond.Wait()
		// }
		// pr := requests[0]
		// copy(requests, requests[1:])
		// requests = requests[0 : len(requests)-1]
		// requestsForPolling[pathPrefix] = requests
		// // TODO: underlying array stays large, you could trim it at some point?
		// // or use a linked list or something
		// json.NewEncoder(w).Encode(pr)
	})

	// 🙊🙊🙊🙊🙊🙊🙊🙊
	// handlerMux = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	// 	// the pollers must have this header or else
	// 	pollerName := r.Header.Get("X-Poller-Key")
	// 	if pollerName == "" {
	// 		pollerMux.ServeHTTP(w, r)
	// 		return
	// 	}
 //
	// 	pollerMu.Lock()
	// 	pollerRequestID++
	// 	pollerMu.Unlock()
 //
	// 	requestIDString := fmt.Sprintf("%d", pollerRequestID)
	// 	rBody, err := ioutil.ReadAll(r.Body)
	// 	if err != nil {
	// 		logAndErr(w, "couldn't open file: %v", err)
	// 		return
	// 	}
	// 	polledRequest := &PolledRequest{
	// 		RequestID: requestIDString,
	// 		Method:    r.Method,
	// 		URL:       r.RequestURI,
	// 		Header:    r.Header,
	// 		Body:      rBody,
	// 	}
	// 	pollerMu.Lock()
	// 	requestsForPolling[pollerName] = append(requestsForPolling[pollerName], polledRequest)
	// 	pollerMu.Unlock()
	// 	// dead zone. need to unlock so that pollForRequests endpoint can get it and return it
	// 	pollerCond.Broadcast() // could have done this in lock
	// 	pollerMu.Lock()
	// 	defer pollerMu.Unlock()
	// 	startWait := time.Now()
	// 	var polledResponse *PolledResponse
	// 	for {
	// 		if time.Since(startWait) > (10 * time.Second) {
	// 			w.WriteHeader(504)
	// 			fmt.Fprintf(w, "%s", "{}")
	// 			return
	// 		}
	// 		polledResponse = responsesForPolling[requestIDString]
	// 		if polledResponse != nil {
	// 			break
	// 		}
	// 		pollerCond.Wait()
	// 	}
	// 	delete(responsesForPolling, requestIDString)
 //
	// 	w.WriteHeader(polledResponse.StatusCode)
	// 	// add headers
	// 	for k, v := range polledResponse.Header {
	// 		w.Header().Set(k, v[0])
	// 	}
	// 	w.Write(polledResponse.Body)
 //
	// })

	certFile := os.Getenv("CERTFILE")
	keyFile := os.Getenv("KEYFILE")

	httpsServer := &http.Server{
		Addr:         *serverAddress,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		Handler:      handlerMux,
	}


	log.Fatal(httpsServer.ListenAndServeTLS(certFile, keyFile))
}



write some go code that implements an http server
that does long polling
it polls for


