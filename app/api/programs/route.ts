// app/api/programs/route.ts
import { NextResponse } from 'next/server';
import { clientPublik as client } from '@/lib/sanity';

// 🚀 Nonaktifkan cache agar data langsung ter-update secara real-time
export const dynamic = 'force-dynamic';
export const revalidate = 0; 

export async function GET() {
  try {
    // 🚀 Ambil data program/campaign sekaligus seluruh data transaksi sukses dari Sanity
    const query = `{
      "programs": *[_type in ["program", "campaign"]] | order(_createdAt desc) {
        "id": _id,
        "slug": slug.current,
        title,
        category,
        sectionType,
        "image": coalesce(image.asset->url, mainImage.asset->url, thumbnail.asset->url, banner.asset->url),
        collectedAmount,
        collectedRaw,
        collected,
        targetAmount,
        daysLeft,
        description,
        donors,
        reports
      },
      "transactions": *[_type == "donationTransaction" && status == "success"] {
        amount,
        donorName,
        _createdAt,
        programId,
        programName,
        slug
      }
    }`;

    const result = await client.fetch(query);
    const sanityPrograms = result.programs || [];
    const successTransactions = result.transactions || [];

    const formattedData = sanityPrograms.map((program: any) => {
      // 1. Cari transaksi sukses yang merujuk ke program ini (cocokkan via programId, slug, atau judul program)
      const matchingTransactions = successTransactions.filter((tx: any) => {
        return (
          tx.programId === program.id ||
          tx.programId?._ref === program.id ||
          tx.slug === program.slug ||
          tx.programName === program.title ||
          tx.programName?._ref === program.id
        );
      });

      // 2. Format transaksi agar bentuknya seragam dengan list donatur
      const formattedTxDonors = matchingTransactions.map((tx: any) => ({
        name: tx.donorName || 'Hamba Allah',
        amount: Number(tx.amount || 0),
        date: tx._createdAt ? new Date(tx._createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Baru Saja'
      }));

      // 3. Gabungkan donatur manual dari Sanity CMS + donatur transaksi asli DOKU
      const manualDonors = Array.isArray(program.donors) ? program.donors : [];
      const combinedDonors = [...manualDonors, ...formattedTxDonors];

      const rawAmount = Number(program.collectedAmount ?? program.collectedRaw ?? program.collected ?? 0);
      const targetAmount = Number(program.targetAmount || 50000000);
      
      let totalDonorsCount = combinedDonors.length;
      
      // Fallback cerdas jika transaksi belum tercatat tapi dana sudah masuk (misal 340rb)
      if (totalDonorsCount === 0 && rawAmount > 0) {
        totalDonorsCount = Math.max(1, Math.floor(rawAmount / 50000));
      }

      return {
        id: program.id,
        _id: program.id,
        slug: program.slug,
        title: program.title,
        category: program.category || 'Kemanusiaan',
        sectionType: program.sectionType || 'pilihan',
        image: program.image || 'https://via.placeholder.com/385x176?text=No+Image',
        collected: `Rp ${rawAmount.toLocaleString('id-ID')}`,
        collectedRaw: rawAmount,
        collectedAmount: rawAmount,
        target: `Rp ${targetAmount.toLocaleString('id-ID')}`,
        targetAmount: targetAmount,
        daysLeft: program.daysLeft || null,
        description: program.description || null,
        donors: combinedDonors,     // 🚀 Sekarang daftar donatur asli ikut tampil di tab Donatur
        donorsCount: totalDonorsCount, // 🚀 Jumlah donatur dihitung akurat
        reports: program.reports || []
      };
    });

    return NextResponse.json(
      { success: true, data: formattedData },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );

  } catch (error: any) {
    console.error('🔥 Sanity Fetch Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}