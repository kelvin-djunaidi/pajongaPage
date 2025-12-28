"use client";
import { usePathname } from "next/navigation";

export default function DesktopAccessCheck({ children }) {
  const pathname = usePathname();
  
  // Allow desktop access for bot pages
  const allowDesktop = pathname === "/tenri" || pathname === "/pajonga" || pathname === "/tenriEn" || pathname === "/pajongaEn";
  
  if (allowDesktop) {
    return children;
  }
  
  // For other pages, show mobile-only content
  return (
    <>
      <div className="md:hidden">{children}</div>
      <div className="hidden md:flex flex-col bg-[#DBE8F5] w-screen h-screen text-[3.5svh] items-center justify-center text-black text-center font-semibold tracking-wider">
        <div className="fixed top-[4svh] left-[4svh]">
          <img
            src="/images/program-logos.png"
            alt="logo"
            className="w-auto h-[10svh]"
          />
        </div>
        <div>Selamat datang di Tur Salah Jalan</div>
        <div className="mt-[6svh] mb-[2svh]">Website ini dirancang untuk pengalaman mobile yang optimal</div>
        <div className="text-[2.5svh] text-gray-600 max-w-[60%] text-center">
          Untuk pengalaman terbaik, gunakan smartphone atau tablet. 
          Namun, Anda tetap dapat mengakses konten melalui desktop.
        </div>
        <div>
          <img
            src="/images/qr.png"
            alt="qr-code"
            className="w-auto h-[30svh]"
          />
        </div>
        <div
          className={`absolute left-0 flex justify-center items-center bottom-[8svh] text-[3svh] text-black w-full font-normal transition-opacity duration-1000 ease-in-out`}
        >
          © 2025 Mis-guided Walktour. All Rights Reserved.
        </div>
      </div>
    </>
  );
}
