// Use Head from 'next/head' in page components (importing from 'next/document' breaks runtime context)
import Head from "next/head";
import { GetAnalysisResults } from "@/components/data/GetAnalysisResults";

export default function Home() {
  return (
    <>
      <Head>
        <title>Quant Decision Dashboard</title>
        <meta name="description" content="Quant analysis visual dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <GetAnalysisResults />
      </main>
    </>
  );
}
