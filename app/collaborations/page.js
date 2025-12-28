"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { languages } from "../dictionaries/languages";
import Navigation from "../components/Navigation";

export default function NewPage() {
  const [state, setState] = useState(0);
  const { currentLanguage } = useLanguage();
  const t = languages[currentLanguage];

  useEffect(() => {
    setState(2);
  }, []);

  return (
    <div
      className={`font-[var(--font-saira)] ${
        state <= 2 ? "bg-[#DBE8F5]" : "bg-white"
      } transition-colors flex items-center justify-center min-h-[100svh] max-w-screen overflow-hidden relative`}
    >
      <img
        src="/images/logo.png"
        alt="Logo"
        className={`w-[80svw] h-auto lg:w-auto lg:h-[40svh] transition-opacity duration-1000 ease-in-out absolute ${
          state === 1 ? "opacity-100" : "opacity-0"
        }`}
      />

      <Navigation showHomeLink={false} />

      <div
        className={`${
          state == 2 ? "opacity-100" : "opacity-0"
        } transition-opacity duration-1000 ease-in-out flex flex-col px-[8svw] h-full pt-[20svh] items-center text-black font-semibold`}
      >
        <div className="text-[7svw] tracking-wider">{t.collaborationsTitle}</div>
        <div className="font-regular text-[3.5svw] leading-[6.5svw] mt-[5svh] text-justify">
          {t.collaborationsDescription}
        </div>
        <Link href="/">
          <svg
            className="w-[20svw] h-auto mt-[5svh]"
            width="52"
            height="16"
            viewBox="0 0 52 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292893 7.29289ZM52 8V7L1 7V8V9L52 9V8Z"
              fill="black"
            />
          </svg>
        </Link>
{/* Copyright */}
        <div
          className={` flex justify-center items-center  text-[3svw] text-black font-normal mt-[10svh] mb-[6svh]`}
        >
          {t.copyright}
        </div>
      </div>
    </div>
  );
}
