package main

import (
    "net/http"
    "container/list"
    "encoding/json"
    "time"
    "strings"
    "io"
    "strconv"
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

func (resp *Response) ToResponseWriter(w http.ReponseWriter) {
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

type EventLoop struct {
    Ch chan *Event
    Process func(*Event)
    Timeouts map[int]*time.Timer
    TimerCount int
}
func (e *EventLoop) Start() {
    for event := range e.Ch {
        if event.TimerID != 0 {
            delete(e.Timeouts, event.TimerID)
        }
        e.Process(event)
    }
}
func (e *EventLoop) Dispatch(name string, data ...any) {
    event := &Event{
        Name: name,
        Data: data,
    }
    go func() {
        e.Ch <- event
    }()
}

func (e *EventLoop) SetTimeout(d time.Duration, name string, data ...any) int {
    e.TimerCount++
    event := &Event{
        Name: name,
        Data: data,
        TimerID: e.TimerCount,
    }
    t := time.AfterFunc(d, func() {
        e.Ch <- event
    })
    // If timer already went off, the event loop handling will delete this
    e.Timeouts[event.TimerID] = t
    return event.TimerID
}
func (e *EventLoop) ClearTimeout(t int) {
    timer := e.Timeouts[t]
    if timer != nil {
        timer.Stop()
    }
}

type Event struct {
    Name string
    Data []any
    TimerID int
}

type EventLoopRequest struct {
    Request *http.Request
    ResponseWriter http.ResponseWriter
    ID int
    IsDone bool
    ch chan int
    Timeout int
}
func NewEventLoopRequest(w http.ResponseWriter, r *http.Request) *EventLoopRequest {
    e := &EventLoopRequest{
        ch: make(chan int, 1),
        Request: r,
        ResponseWriter: w,
    }
    return e
}
func (e *EventLoopRequest) Done() {
    e.IsDone = true
    e.ch <- 1
}
func (e *EventLoopRequest) Wait() {
    <- e.ch
}


type PollerProxyServer struct {
    EventLoop *EventLoop
    RequestCount int
	Requests map[string]*list.List
	PollingRequests map[string]*list.List
	RequestsByID map[string]*EventLoopRequest
}

func NewPollerProxyServer() *PollerProxyServer {
	pps := &PollerProxyServer{
	    EventLoop: &EventLoop{
	        // buffered
	        Ch: make(chan *Event),
	    },
	    Requests: map[string]*list.List{},
	    // Requesting the requests
	    PollingRequests: map[string]*list.List{},
	    RequestsByID: map[string]*EventLoopRequest{},
	}
	pps.EventLoop.Process = pps.Process
    go func() {
        pps.EventLoop.Start()
    }()
	return pps
}
func (p *PollerProxyServer) HttpToCustomRequest(req *http.Request) (*Request, error) {
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	p.RequestCount++
	customReq := &Request{
		// RequestID: req.Header.Get("X-Request-ID"),
		RequestID: strconv.Itoa(p.RequestCount),
		Method:    req.Method,
		URL:       req.URL.String(),
		Header:    req.Header,
		Body:      body,
	}
	
	return customReq, nil
}


// try long polling pattern and limited concurrency pattern
func (p *PollerProxyServer) Process(e *Event) {
    switch (e.Name) {
    case "http_request":
        elr := e.Data[0].(*EventLoopRequest)
        r := elr.Request
        if r.URL.Path == "/pollerProxy/pollForRequest" {
            pollerName := r.FormValue("poller_name")
            // TODO for security in future, add a mapping
            pathPrefix := pollerName
            availableRequests := p.Requests[pathPrefix]
            if availableRequests != nil && availableRequests.Len() > 0 {
                aEl := availableRequests.Front()
                a := aEl.Value.(*Request)
                availableRequests.Remove(aEl)
                json.NewEncoder(elr.ResponseWriter).Encode(a)
                elr.Done()
                return
            }
            elrEl := p.AddPollingRequest(pathPrefix, elr)
            elr.Timeout := p.EventLoop.SetTimeout(10 * time.Second, "http_request_timeout", pathPrefix, elrEl)
        } else if r.URL.Path == "/pollerProxy/provideResponse" {
            response := &Response{}
            err := json.NewDecoder(r.Body).Decode(response)
            if err != nil {
                elr.ResponseWriter.WriteHeader(http.StatusBadRequest)
                elr.Done()
                return
            }
            correspondingElr := p.RequestsByID[response.RequestID]
            p.EventLoop.ClearTimeout
            response.ToResponseWriter(correspondingElr.ResponseWriter)
        } else {
            // requests from users
            parts := strings.Split(r.URL.Path, "/")
            pathPrefix := parts[1]
            customRequest, err := p.HttpToCustomRequest(r)
            if err != nil {
                elr.ResponseWriter.WriteHeader(http.StatusBadRequest)
                elr.Done()
                return
            }
            p.Requests[pathPrefix].PushBack(customRequest)
            p.RequestsByID[customRequest.RequestID] = elr
        }
    case "http_request_timeout":
        pathPrefix := e.Data[0].(string) // we could get this from the request if we want
        elrEl := e.Data[1].(*list.Element)
        elr := elrEl.Value.(*EventLoopRequest)
        p.PollingRequests[pathPrefix].Remove(elrEl)
        if !elr.IsDone {
            elr.ResponseWriter.WriteHeader(http.StatusNoContent)
            elr.Done()
        }
    }
}

func (p *PollerProxyServer) AddPollingRequest(pathPrefix string, v any) *list.Element {
    if p.PollingRequests == nil {
        p.PollingRequests = map[string]*list.List{}
    }
    myList := p.PollingRequests[pathPrefix]
    if myList == nil {
        myList = list.New()
        p.PollingRequests[pathPrefix] = myList
    }
    return myList.PushBack(v)
}
func (p *PollerProxyServer) AddRequest(pathPrefix string, v any) *list.Element {
    if p.Requests == nil {
        p.Requests = map[string]*list.List{}
    }
    myList := p.Requests[pathPrefix]
    if myList == nil {
        myList = list.New()
        p.Requests[pathPrefix] = myList
    }
    return myList.PushBack(v)
}
func (p *PollerProxyServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	elr := NewEventLoopRequest(w, r)
	p.EventLoop.Dispatch("http_request", elr)
}
	

