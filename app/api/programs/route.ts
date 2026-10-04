// app/api/programs/route.ts

import { NextResponse } from 'next/server';
import { clientPublik as client } from '@/lib/sanity';

// ============================================================================
// CACHE
// ============================================================================

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================================
// HELPER
// ============================================================================

function formatDateID(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// GET PROGRAMS
// ============================================================================

export async function GET() {
  try {
    // ========================================================================
    // QUERY SANITY
    // ========================================================================
    //
    // Penting:
    // - programs       = program donasi
    // - transactions   = transaksi sukses
    // - reports        = dokumen Laporan Penyaluran TERPISAH
    //
    // Query laporan dibuat cukup fleksibel agar tetap terbaca bila nama
    // _type yang dipakai adalah laporanPenyaluran / laporan / report.
    //
    // ========================================================================

    const query = `{
      "programs": *[
        _type in ["program", "campaign"]
      ] | order(_createdAt desc) {
        "id": _id,
        "_id": _id,

        "slug": slug.current,

        title,
        category,
        sectionType,

        "image": coalesce(
          image.asset->url,
          mainImage.asset->url,
          thumbnail.asset->url,
          banner.asset->url
        ),

        collectedAmount,
        collectedRaw,
        collected,
        targetAmount,
        daysLeft,
        description,

        donors,

        // Tetap ambil laporan lama jika sebelumnya
        // pernah disimpan langsung di dalam program.
        reports
      },

      "transactions": *[
        _type == "donationTransaction" &&
        status == "success"
      ] {
        amount,
        donorName,
        _createdAt,
        programId,
        programName,
        slug
      },

      "reports": *[
        _type in [
          "laporanPenyaluran",
          "laporan",
          "report",
          "distributionReport"
        ]
      ] | order(
        coalesce(
          tanggalPenyaluran,
          date,
          tanggal,
          _createdAt
        ) desc
      ) {
        "_id": _id,
        "_key": _id,
        "_type": _type,

        // --------------------------------------------------------------
        // JUDUL
        // --------------------------------------------------------------

        "title": coalesce(
          judulAktivitas,
          title,
          judul,
          name
        ),

        // --------------------------------------------------------------
        // TANGGAL
        // --------------------------------------------------------------

        "dateRaw": coalesce(
          tanggalPenyaluran,
          date,
          tanggal,
          _createdAt
        ),

        // --------------------------------------------------------------
        // ISI LAPORAN
        // --------------------------------------------------------------

        "content": coalesce(
          content,
          description,
          deskripsi,
          isiLaporan,
          body
        ),

        // --------------------------------------------------------------
        // GAMBAR
        // --------------------------------------------------------------

        "image": coalesce(
          image.asset->url,
          mainImage.asset->url,
          foto.asset->url,
          dokumentasi.asset->url
        ),

        // --------------------------------------------------------------
        // REFERENCE PROGRAM
        //
        // Dibuat fleksibel untuk beberapa kemungkinan nama field.
        // --------------------------------------------------------------

        "programRef": coalesce(
          program._ref,
          programDonasi._ref,
          campaign._ref,
          relatedProgram._ref,
          programReference._ref
        ),

        // Jika field reference punya nama berbeda tetapi dereference
        // tersedia pada beberapa field umum:
        "programSlug": coalesce(
          program->slug.current,
          programDonasi->slug.current,
          campaign->slug.current,
          relatedProgram->slug.current,
          programReference->slug.current
        ),

        "programTitle": coalesce(
          program->title,
          programDonasi->title,
          campaign->title,
          relatedProgram->title,
          programReference->title
        )
      }
    }`;

    // ========================================================================
    // FETCH SANITY
    // ========================================================================

    const result = await client.fetch(query);

    const sanityPrograms =
      Array.isArray(result?.programs)
        ? result.programs
        : [];

    const successTransactions =
      Array.isArray(result?.transactions)
        ? result.transactions
        : [];

    const sanityReports =
      Array.isArray(result?.reports)
        ? result.reports
        : [];

    // Debug server.
    // Bisa dilihat di terminal tempat Next.js berjalan.
    console.log(
      '📦 PROGRAMS:',
      sanityPrograms.length
    );

    console.log(
      '💰 SUCCESS TRANSACTIONS:',
      successTransactions.length
    );

    console.log(
      '📋 LAPORAN PENYALURAN:',
      sanityReports.length
    );

    // ========================================================================
    // FORMAT PROGRAM
    // ========================================================================

    const formattedData = sanityPrograms.map(
      (program: any) => {
        // ====================================================================
        // 1. TRANSAKSI PROGRAM
        // ====================================================================

        const matchingTransactions =
          successTransactions.filter(
            (tx: any) => {
              const txProgramId =
                typeof tx?.programId === 'string'
                  ? tx.programId
                  : tx?.programId?._ref;

              const txProgramName =
                typeof tx?.programName === 'string'
                  ? tx.programName
                  : tx?.programName?._ref;

              return (
                txProgramId === program.id ||
                txProgramId === program._id ||
                tx?.slug === program.slug ||
                txProgramName === program.title ||
                txProgramName === program.id ||
                txProgramName === program._id
              );
            }
          );

        // ====================================================================
        // 2. FORMAT DONATUR TRANSAKSI
        // ====================================================================

        const formattedTxDonors =
          matchingTransactions.map(
            (tx: any) => ({
              name:
                tx?.donorName ||
                'Hamba Allah',

              amount:
                Number(tx?.amount || 0),

              date:
                tx?._createdAt
                  ? new Date(
                      tx._createdAt
                    ).toLocaleDateString(
                      'id-ID',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }
                    )
                  : 'Baru Saja',
            })
          );

        // ====================================================================
        // 3. DONATUR MANUAL
        // ====================================================================

        const manualDonors =
          Array.isArray(program?.donors)
            ? program.donors
            : [];

        const combinedDonors = [
          ...manualDonors,
          ...formattedTxDonors,
        ];

        // ====================================================================
        // 4. NOMINAL
        // ====================================================================

        const rawAmount =
          Number(
            program?.collectedAmount ??
              program?.collectedRaw ??
              program?.collected ??
              0
          ) || 0;

        const targetAmount =
          Number(
            program?.targetAmount ||
              50_000_000
          ) || 50_000_000;

        // ====================================================================
        // 5. JUMLAH DONATUR
        // ====================================================================

        let totalDonorsCount =
          combinedDonors.length;

        if (
          totalDonorsCount === 0 &&
          rawAmount > 0
        ) {
          totalDonorsCount = Math.max(
            1,
            Math.floor(
              rawAmount / 50_000
            )
          );
        }

        // ====================================================================
        // 6. LAPORAN LAMA YANG TERTANAM DI PROGRAM
        // ====================================================================

        const embeddedReports =
          Array.isArray(program?.reports)
            ? program.reports
            : [];

        // ====================================================================
        // 7. CARI LAPORAN PENYALURAN YANG TERHUBUNG KE PROGRAM INI
        // ====================================================================

        const linkedReports =
          sanityReports.filter(
            (report: any) => {
              // --------------------------------------------------------------
              // Cocokkan reference ID
              // --------------------------------------------------------------

              const matchById =
                report?.programRef &&
                (
                  report.programRef ===
                    program.id ||
                  report.programRef ===
                    program._id
                );

              // --------------------------------------------------------------
              // Cocokkan slug sebagai fallback
              // --------------------------------------------------------------

              const matchBySlug =
                report?.programSlug &&
                program?.slug &&
                String(
                  report.programSlug
                ).toLowerCase() ===
                  String(
                    program.slug
                  ).toLowerCase();

              // --------------------------------------------------------------
              // Cocokkan judul sebagai fallback terakhir
              // --------------------------------------------------------------

              const matchByTitle =
                report?.programTitle &&
                program?.title &&
                String(
                  report.programTitle
                )
                  .trim()
                  .toLowerCase() ===
                  String(
                    program.title
                  )
                    .trim()
                    .toLowerCase();

              return Boolean(
                matchById ||
                  matchBySlug ||
                  matchByTitle
              );
            }
          );

        // ====================================================================
        // 8. FORMAT LAPORAN
        // ====================================================================

        const formattedLinkedReports =
          linkedReports.map(
            (report: any) => ({
              _key:
                report?._key ||
                report?._id,

              _id:
                report?._id,

              title:
                report?.title ||
                'Laporan Penyaluran',

              date:
                formatDateID(
                  report?.dateRaw
                ),

              dateRaw:
                report?.dateRaw ||
                null,

              content:
                report?.content ||
                null,

              image:
                report?.image ||
                null,
            })
          );

        // ====================================================================
        // 9. GABUNG LAPORAN
        // ====================================================================

        const combinedReports = [
          ...embeddedReports,
          ...formattedLinkedReports,
        ];

        // Debug matching
        console.log(
          `📋 ${program?.title}:`,
          `${combinedReports.length} laporan`
        );

        // ====================================================================
        // 10. RETURN PROGRAM
        // ====================================================================

        return {
          id: program.id,
          _id: program.id,

          slug:
            program.slug,

          title:
            program.title,

          category:
            program.category ||
            'Kemanusiaan',

          sectionType:
            program.sectionType ||
            'pilihan',

          image:
            program.image ||
            '/images/placeholder.jpg',

          collected:
            `Rp ${rawAmount.toLocaleString(
              'id-ID'
            )}`,

          collectedRaw:
            rawAmount,

          collectedAmount:
            rawAmount,

          target:
            `Rp ${targetAmount.toLocaleString(
              'id-ID'
            )}`,

          targetAmount,

          daysLeft:
            program.daysLeft ||
            null,

          description:
            program.description ||
            null,

          donors:
            combinedDonors,

          donorsCount:
            totalDonorsCount,

          // ================================================================
          // INI YANG AKAN DIBACA CampaignDetailClient
          // ================================================================

          reports:
            combinedReports,

          reportsCount:
            combinedReports.length,
        };
      }
    );

    // ========================================================================
    // RESPONSE
    // ========================================================================

    return NextResponse.json(
      {
        success: true,
        data: formattedData,

        // sementara berguna untuk memastikan API menemukan laporan
        meta: {
          programs:
            sanityPrograms.length,

          transactions:
            successTransactions.length,

          reports:
            sanityReports.length,
        },
      },
      {
        status: 200,

        headers: {
          'Content-Type':
            'application/json',

          'Cache-Control':
            'no-store, no-cache, must-revalidate, max-age=0',

          Pragma:
            'no-cache',

          Expires:
            '0',
        },
      }
    );
  } catch (error: any) {
    console.error(
      '🔥 Sanity Fetch Error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          'Gagal mengambil data program.',
      },
      {
        status: 500,

        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  }
}