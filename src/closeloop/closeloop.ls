#!/usr/local/bin/linescript4

# [.hi]
# slice -2 -1
# say
# exit

# testing reader
# var r toReader %% HmmHello__how are you?__Is this on?
# var rs makeReadSplitter r "__"
# forever
#     say "reading again..."
#     readMessage rs
# 
#     var message it
#     # if message is null: goDown .doneRead
#     say "message is" toJson message
# 
#     if message is ""
#        say "should be going down"
#        goDown doneRead
#     end
#     # say "message is" message
# 
#     #endOfLoop
#     say "..."
#     sleepMs 1000
# end
# #doneRead
# say "did we go down?"
# say "I think so"



def makeReadSplitter reader delimeter
    var readChunkSize 64
    if readChunkSize < len delimeter
        say "error chunk size < delimeter"
        exit
    end
    {
        reader reader
        delimeter delimeter
        readChunkSize readChunkSize
        messages []
        leftOver ""
    }
end

# TODO: add timeout
def readMessage readSplitter
    useVars readSplitter
    forever
        if len messages, > 0
            return shift messages
        end
        var chunk read reader readChunkSize
        if chunk len, is 0
            if len leftOver, > 0
                leftOver
                let leftOver ""
                return
            end
            return ""
        end
        var chunk leftOver ++ chunk
        var parts chunk split delimeter
        var leftOver parts pop
        parts each: messages push it
    end
end


def chatGptCall
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
        for i in {1..3}; do date; echo ""; sleep 1; done
    end
    execBashStdout
    makeReadSplitter it newline ++ newline
    as rs
    forever
        say "reading"
        readMessage rs
        as theMessage
        if theMessage is ""
            goDown doneRead
        end
        say "message is" theMessage
    end #doneRead
end
# "input": "tell me a 5-10 word story",

say "agent loopie"
def agentLoop
    chatGptCall
    
    say %% sleeping
    sleepMs 2000
end

agentLoop


