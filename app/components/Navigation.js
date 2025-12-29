"use client";

import { useState } from 'react';
import Link from 'next/link';
import LanguageDropdown from './LanguageDropdown';

export default function Navigation({ showHomeLink = true, isMainPage = false, state = 0 }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Full-screen modal */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-[#DBE8F5] z-20 text-[7svw] font-semibold text-black pt-[30svh] px-[8svw]"
          style={{ top: "0", left: "0", width: "100vw", height: "100vh" }}
        >
          <div className="flex flex-col gap-[4svh]">
            {showHomeLink && (
              <div
                className="cursor-pointer"
                onClick={() => window.location.href = "/"}
              >
                Home
              </div>
            )}
          </div>

          <Link href="https://instagram.com/tursalahjalan" target="_blank">
            <img
              src="/images/instagram.png"
              alt="instagram"
              className="h-[16svw] mt-[6svh]"
            />
          </Link>
        </div>
      )}

      <nav
        className={`fixed top-[2svh] left-0 w-full h-fit px-[2svw] z-30 transition-opacity duration-1000 ease-in-out flex flex-col ${isMainPage ? (state >= 2 ? "opacity-100" : "opacity-0") : "opacity-100"
          }`}
      >
        <div>
          <img
            src="/images/program-logos.png"
            alt="logo"
            className="lg:h-[8svh] h-[5svh] w-auto"
          />
        </div>
        <div className="flex justify-between items-center pr-[3svw]">
          <Link href="/">
            <img
              src="/images/logo.png"
              alt="logo"
              className="lg:h-[16svh] h-[12svh] w-auto"
            />
          </Link>

          <div className="flex items-center gap-[2svw]">
            <LanguageDropdown />

            <button className="mb-[4svh] cursor-pointer" onClick={toggleMenu}>
              <img
                src={isMenuOpen ? "/images/close.png" : "/images/hamburger.png"}
                alt={isMenuOpen ? "close" : "hamburger"}
                className="h-[5svh] w-auto"
              />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
