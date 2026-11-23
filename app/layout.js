import "./globals.css";

export const metadata = {
  title: "Chronological Bible Reading",
  description: "Read the Bible in 365 sessions, in the order the events happened.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
