#!/usr/local/bin/linescript4

say "hello"



def .onMessage .m
    say m
end

def makeReadSplitter .reader .delimeter
    local .readChunkSize 64
    if readChunkSize < len delimeter
        say "error chunk size < delimeter"
        exit
    end
    {
        .reader reader
        .delimeter delimeter
        .readChunkSize 64
        .messages []
        .leftOver ""
        
    }
end
def .readMessage .r # readSplitter
    forever
        if len (r at .messages), > 0
            shift (r at .messages)
            return
        end
        read r at .reader, readChunkSize
        (r at .leftOver) ++ it
        split (r at .delimeter)
        slice 1 -2 # last one could have part of the delimeter
        r .at messages, push it
    end
end


def .chatGptCall
    %%
        # curl "https://api.openai.com/v1/responses" \
        #   -H "Content-Type: application/json" \
        #   -H "Authorization: Bearer $CHATGPTKEY"  \
        #   -d '{
        #       "model": "gpt-4.1",
        #       "input": "tell me a 20 word story",
        #       "stream": true
        #   }'
        # while true; do date; sleep 1; done
        # for i in {1..10}; do date; sleep 1; done
        for i in {1..10}; do date; done
    end
    execBashStdout
    as .output
    # say output
    forever
        say "reading"
        .b = read output 64
        say %% we read %b
        sleepMs 250
        # TODO: fix oneline if
        if b is ""
            say "we got nothing!"
            goDown .doneRead
        end
    end #doneRead
end
# "input": "tell me a 5-10 word story",




def .agentLoop
    chatGptCall
end

agentLoop


