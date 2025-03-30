
def :timeIt
   nowMillis
   onEnd func
       nowMillis - start
   end
end


def :timeIt :f
    let :start nowMillis
    f
    nowMillis - start
end

timeIt func
   say "what"
end

def :map
end

say "yay stdlib"

