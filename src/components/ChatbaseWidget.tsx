import { useEffect } from 'react';

declare global {
  interface Window {
    chatbase: any;
  }
}

export default function ChatbaseWidget() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingScript = document.getElementById('SrZa4mmda2_Yhachf0ks4');
    if (existingScript) return;

    (function() {
      if (!window.chatbase || window.chatbase("getState") !== "initialized") {
        window.chatbase = (...args: any[]) => {
          if (!window.chatbase.q) {
            window.chatbase.q = [];
          }
          window.chatbase.q.push(args);
        };
        window.chatbase = new Proxy(window.chatbase, {
          get(target, prop) {
            if (prop === "q") {
              return target.q;
            }
            return (...args: any[]) => target(prop, ...args);
          }
        });
      }

      const onLoad = function() {
        const script = document.createElement("script");
        script.src = "https://www.chatbase.co/embed.min.js";
        script.id = "SrZa4mmda2_Yhachf0ks4";
        script.setAttribute("domain", "www.chatbase.co");
        script.defer = true;
        document.body.appendChild(script);
      };

      if (document.readyState === "complete") {
        onLoad();
      } else {
        window.addEventListener("load", onLoad);
      }
    })();

    return () => {
      const script = document.getElementById('SrZa4mmda2_Yhachf0ks4');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return null;
}
