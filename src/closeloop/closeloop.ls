#!/usr/local/bin/linescript4

# [.hi]
# slice -2 -1
# say
# exit


local r toReader %% HmmHello__how are you?__Is this on?
local rs makeReadSplitter r "__"
forever
    readMessage rs
    local message it
    # if message is null: goDown .doneRead
    if message is null
       goDown .doneRead
    end
    say message
    
    sleepMs 1000
end #doneRead
exit

def makeReadSplitter .reader .delimeter
    # local .readChunkSize 64
    local .readChunkSize 64
    if readChunkSize < len delimeter
        say "error chunk size < delimeter"
        exit
    end
    {
        .reader reader
        .delimeter delimeter
        .readChunkSize readChunkSize
        .messages []
        .leftOver ""
    }
end

# TODO: add timeout
def readMessage .readSplitter
    say "called readMessage: vals #A", debugVals
    useVars readSplitter
    # forever
    20 loop i
        if len messages, > 0
            say "#yellow bang"
            debugVals
            return shift messages
        end
        say "vals #B", debugVals
        local chunk read reader readChunkSize
        say "vals #C", debugVals
        if chunk len, is 0
            say "vals #D", debugVals
            if len leftOver, > 0
                say "vals #E", debugVals
                leftOver
                say "vals #F", debugVals
                say "#orange bang" leftOver
                say "vals #G", debugVals
                .leftOver = ""
                return
            end
            say "#pink bang"
            debugVals
            return null
        end
        say "vals #H", debugVals
        local chunk leftOver ++ chunk
        say "vals #I", debugVals
        local parts chunk split delimeter
        say "vals #J", debugVals
        local leftOver parts pop
        say "vals #K", debugVals
        parts each: messages push parts
        say "vals #L", debugVals
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


