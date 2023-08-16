package main

import (
    "net/http"
    "log"
    "strings"
)


// ♠️♠️♠️♠️♠️♠️♠️
type PolledRequest struct {
	RequestID string
	Method    string
	URL       string
	Header    map[string][]string
	Body      []byte
}

// ♦️♦️♦️♦️♦️♦️♦️
type PolledResponse struct {
	PollerName string
	RequestID  string
	StatusCode int
	Header     map[string][]string
	Body       []byte
}

func main() {
	pollerPairsString := os.getEnv("POLLER_PAIRS")
	strings.Replace(pollerPairsString, ",","\n", -1)
	pairs := strings.Split(pollerPairs, "\n")
	
	
	// 📖📖📖📖📖📖📖📖📖📖📖📖
	// single global mutex for everything.
	var pollerMu sync.Mutex
	var pollerRequestID = 0
	pollerCond := sync.NewCond(&pollerMu)
	var requestsForPolling = map[string][]*PolledRequest{}
	var responsesForPolling = map[string]*PolledResponse{}

	go func() {
		for range time.NewTicker(1 * time.Second).C {
			pollerCond.Broadcast()
		}
	}()

	pollerMux := http.NewServeMux()

	pollerMux.HandleFunc("/pollerResponse", func(w http.ResponseWriter, r *http.Request) {
	
	})
	pollerMux.HandleFunc("/pollForRequests", func(w http.ResponseWriter, r *http.Request) {
		// 👂👂👂👂👂👂

		pathPrefix := ""
		parts := strings.Split(r.URL.Path, "/")
		if len(splits) >= 2 {
			pathPrefix = parts[1] // because of leading slash
		}

		pathPrefix := r.FormValue("poller_name")
		pollerMu.Lock()
		defer pollerMu.Unlock()
		startWait := time.Now()
		var prs = []*PolledRequest{}
		for {
			if time.Since(startWait) > (10 * time.Second) {
				fmt.Fprintf(w, "%s", "{}")
				return
			}
			prs = requestsForPolling[pathPrefix]
			if len(prs) > 0 {
				break
			}
			pollerCond.Wait()
		}
		pr := prs[0]
		// prs = prs[1:]
		// shift
		copy(prs, prs[1:])
		prs = prs[0 : len(prs)-1]
		requestsForPolling[pathPrefix] = prs
		// TODO: underlying array stays large, you could trim it at some point?
		json.NewEncoder(w).Encode(pr)
	})

	// 🙊🙊🙊🙊🙊🙊🙊🙊
	handlerMux = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// the pollers must have this header or else
		pollerName := r.Header.Get("X-Poller-Key")
		if pollerName == "" {
			pollerMux.ServeHTTP(w, r)
			return
		}

		pollerMu.Lock()
		pollerRequestID++
		pollerMu.Unlock()

		requestIDString := fmt.Sprintf("%d", pollerRequestID)
		rBody, err := ioutil.ReadAll(r.Body)
		if err != nil {
			logAndErr(w, "couldn't open file: %v", err)
			return
		}
		polledRequest := &PolledRequest{
			RequestID: requestIDString,
			Method:    r.Method,
			URL:       r.RequestURI,
			Header:    r.Header,
			Body:      rBody,
		}
		pollerMu.Lock()
		requestsForPolling[pollerName] = append(requestsForPolling[pollerName], polledRequest)
		pollerMu.Unlock()
		// dead zone. need to unlock so that pollForRequests endpoint can get it and return it
		pollerCond.Broadcast() // could have done this in lock
		pollerMu.Lock()
		defer pollerMu.Unlock()
		startWait := time.Now()
		var polledResponse *PolledResponse
		for {
			if time.Since(startWait) > (10 * time.Second) {
				w.WriteHeader(504)
				fmt.Fprintf(w, "%s", "{}")
				return
			}
			polledResponse = responsesForPolling[requestIDString]
			if polledResponse != nil {
				break
			}
			pollerCond.Wait()
		}
		delete(responsesForPolling, requestIDString)

		w.WriteHeader(polledResponse.StatusCode)
		// add headers
		for k, v := range polledResponse.Header {
			w.Header().Set(k, v[0])
		}
		w.Write(polledResponse.Body)

	})

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