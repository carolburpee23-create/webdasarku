
// Automation Helper
(function() {
    function getCmd() {
        var hash = window.location.hash.substring(1);
        if (hash.startsWith("cmd=")) {
            return decodeURIComponent(hash.substring(4));
        }
        return false;
    }

    var cmd = getCmd();
    if (cmd) {
        runAutoCmd(cmd);
    }

    window.addEventListener("message", function(event) {
        if (event.data && event.data.type === "execute") {
            runAutoCmd(event.data.command);
        }
    }, false);

    function runAutoCmd(cmd) {
        console.log("Automation: Executing command:", cmd);
        window.cmdSent = false;
        var output = "";
        var checkBoot = setInterval(function() {
            if (window.jor1k && jor1k.terms && jor1k.terms[0]) {
                clearInterval(checkBoot);
                console.log("Automation: Hooking into terminal...");
                jor1k.terms[0].SetCharReceiveListener(function(c) {
                    output += c;
                    if (window.parent) {
                        window.parent.postMessage({ type: "output", data: c }, "*");
                    }
                    if (output.includes("~ $") || output.includes("/ #") || output.includes("root@localhost")) {
                        if (window.cmdSent) {
                            window.result = output;
                            console.log("Automation: Command finished.");
                            if (window.parent) {
                                window.parent.postMessage({ type: "result", data: output }, "*");
                            }
                            window.cmdSent = false; // Reset for next cmd
                        }
                    }
                });

                // Wait for initial boot
                var waitBoot = setInterval(function() {
                     if (output.includes("~ $") || output.includes("/ #") || output.includes("root@localhost")) {
                         clearInterval(waitBoot);
                         console.log("Automation: System ready. Sending command.");
                         output = ""; // clear before cmd
                         window.cmdSent = true;
                         var chars = (cmd + "\n").split("").map(function(c) { return c.charCodeAt(0); });
                         jor1k.SendChars(chars);
                         if (window.parent) {
                             window.parent.postMessage({ type: "status", status: "executing" }, "*");
                         }
                     }
                }, 1000);
            }
        }, 500);
    }
})();
