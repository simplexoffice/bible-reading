import "./globals.css";
import "./band.css";
import "./catalog.css";

export const metadata = {
  title: "Chronological Bible Reading",
  description: "Read the Bible in 365 sessions, in the order the events happened, and open research on the Watchtower Online Library.",
};

const themeScript = `try{var theme=localStorage.getItem("cbr-theme");if(!theme&&matchMedia("(prefers-color-scheme: dark)").matches)theme="dark";if(theme)document.documentElement.setAttribute("data-theme",theme)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
