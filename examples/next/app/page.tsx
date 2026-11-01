'use client';
import { Noktiq } from 'noktiq/react';
export default function Page() {
  return <main style={{ padding: 60 }}><h1>Noktiq + Next.js</h1><button id="next-target">Next source target</button><Noktiq enabled={process.env.NODE_ENV === 'development'} /></main>;
}
