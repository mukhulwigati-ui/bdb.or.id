'use client';

// 🚀 FIXED: Diimport langsung dari package 'next-sanity' resmi
import { NextStudio } from 'next-sanity/studio';
import config from '@/sanity.config'; 

export default function StudioPage() {
  return <NextStudio config={config} />;
}