'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full max-w-md mx-auto pt-3 pb-3 text-center">
      <div className="flex items-center justify-center gap-4 text-xs font-normal text-[#557089]">
        <Link href="/kebijakan-privasi" className="hover:text-sky-600 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/syarat-ketentuan" className="hover:text-sky-600 transition-colors">
          Terms of Service
        </Link>
        <Link href="/bantuan" className="hover:text-sky-600 transition-colors">
          Bantuan
        </Link>
		<Link href="https://onislam.web.id" className="hover:text-sky-600 transition-colors">
          Created by onislam
        </Link>
      </div>
    </footer>
  );
}