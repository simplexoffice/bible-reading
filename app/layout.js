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

const screenScript = `(function(){var root=document.documentElement;function fit(){var layout=window.innerWidth||0;var screenMin=Math.min(window.screen.width||layout,window.screen.height||layout);var desktopSite=screenMin&&screenMin<=500&&layout>=800&&layout>screenMin+80;if(desktopSite){var meta=document.querySelector('meta[name="viewport"]');var content="width="+Math.round(screenMin)+", initial-scale=1, viewport-fit=cover";if(meta&&meta.getAttribute("content")!==content)meta.setAttribute("content",content);return}root.style.removeProperty("--screen");root.style.width="100%";root.style.maxWidth="100%";if(document.body){document.body.style.width="100%";document.body.style.maxWidth="100%"}}fit();window.addEventListener("resize",fit);window.addEventListener("orientationchange",fit);if(window.visualViewport)window.visualViewport.addEventListener("resize",fit);document.addEventListener("DOMContentLoaded",fit)})()`;

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
