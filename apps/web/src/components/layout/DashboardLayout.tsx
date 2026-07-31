import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">

      <Sidebar />

      <div className="flex flex-col flex-1 min-h-screen">

        <Header />

        <main className="flex-1 bg-gray-100 p-8">
          {children}
        </main>

        <Footer />

      </div>
    </div>
  );
}