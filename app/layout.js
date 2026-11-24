import "./globals.css";
import "./band.css";
import "./catalog.css";

export const metadata = {
  title: "Chronological Bible Reading",
  description: "Read the Bible in 365 sessions, in the order the events happened, and open research on the Watchtower Online Library.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `try{var theme=localStorage.getItem("cbr-theme");if(!theme&&matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";if(theme)document.documentElement.setAttribute("data-theme",theme)}catch(e){}`;

const screenScript = `(function(){var root=document.documentElement;function width(){var layout=window.innerWidth||0;var visible=window.visualViewport&&window.visualViewport.width||0;var client=root.clientWidth||0;var nums=[layout,visible,client].filter(function(n){return n>0});var next=nums.length?Math.min.apply(null,nums):layout;var screenMin=Math.min(window.screen.width||next,window.screen.height||next);if(screenMin&&screenMin<=480&&layout>=900&&layout>screenMin+120)next=screenMin;return Math.max(1,Math.round(next))}function fit(){var next=width();root.style.setProperty("--screen",next+"px");if(window.innerWidth>next+40){var meta=document.querySelector('meta[name="viewport"]');if(meta)meta.setAttribute("content","width="+next+", initial-scale=1, viewport-fit=cover")}}fit();window.addEventListener("resize",fit);window.addEventListener("orientationchange",fit);if(window.visualViewport)window.visualViewport.addEventListener("resize",fit);document.addEventListener("DOMContentLoaded",fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit)})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: screenScript }} />
        {children}
      </body>
    </html>
  );
}
