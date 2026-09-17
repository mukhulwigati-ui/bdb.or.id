// components/Campaign.tsx

'use client';

import React from 'react';
import Link from 'next/link';

import {
  ArrowRight,
  Clock3,
  HeartHandshake,
  Users,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface CampaignItem {
  id: string;
  title: string;
  slug: string;
  image: string;

  category?: string;

  collectedAmount?: number;
  collectedRaw?: number;

  targetAmount?: number;
  targetRaw?: number;

  daysLeft?: number;

  donorsCount?: number;
  donors?: any[];
}

interface CampaignProps {
  initialData?: CampaignItem[];

  mendesak?: CampaignItem[];
  unggulan?: CampaignItem[];
  pilihan?: CampaignItem[];
}

// ============================================================
// HELPERS
// ============================================================

function getCollected(
  item: CampaignItem
): number {
  return Math.max(
    0,
    Number(
      item.collectedAmount ??
        item.collectedRaw ??
        0
    ) || 0
  );
}

function getTarget(
  item: CampaignItem
): number {
  const target =
    Number(
      item.targetAmount ??
        item.targetRaw ??
        50000000
    ) || 50000000;

  return target > 0
    ? target
    : 50000000;
}

function getPercentage(
  item: CampaignItem
): number {
  const collected =
    getCollected(item);

  const target =
    getTarget(item);

  if (
    target <= 0 ||
    collected <= 0
  ) {
    return 0;
  }

  return Math.min(
    Math.max(
      Math.round(
        (collected / target) *
          100
      ),
      0
    ),
    100
  );
}

function getDonorsCount(
  item: CampaignItem
): number {
  const explicit =
    Number(
      item.donorsCount ?? 0
    ) || 0;

  if (explicit > 0) {
    return explicit;
  }

  if (
    Array.isArray(
      item.donors
    )
  ) {
    return item.donors.length;
  }

  return 0;
}

function formatRupiah(
  value: number
): string {
  return value.toLocaleString(
    'id-ID'
  );
}

function getImage(
  image?: string
): string {
  if (
    typeof image ===
      'string' &&
    image.trim()
  ) {
    return image;
  }

  return '/images/banner.png';
}

// ============================================================
// SECTION HEADER
// ============================================================

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div>
      <div
        className="
          flex
          items-end
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">

          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-[0.17em]
              text-[#858585]
            "
          >
            {eyebrow}
          </p>

          <h2
            className="
              mt-1
              text-[20px]
              font-bold
              leading-tight
              tracking-tight
              text-[#353535]
            "
          >
            {title}
          </h2>

        </div>

        <Link
          href={href}
          className="
            flex
            shrink-0
            items-center
            gap-1
            pb-[2px]
            text-[10px]
            font-semibold
            text-[#555555]
            transition
            hover:text-[#073f2e]
          "
        >
          Lihat Semua

          <ArrowRight
            className="
              h-3.5
              w-3.5
            "
          />
        </Link>
      </div>

      <p
        className="
          mt-2
          text-[12px]
          leading-relaxed
          text-[#777777]
        "
      >
        {description}
      </p>
    </div>
  );
}

// ============================================================
// PROGRESS BAR
// ============================================================

function ProgressBar({
  percentage,
}: {
  percentage: number;
}) {
  return (
    <div
      className="
        h-[5px]
        w-full
        overflow-hidden
        bg-[#dedede]
      "
    >
      <div
        className="
          h-full
          bg-[#d9232e]
          transition-all
          duration-500
        "
        style={{
          width:
            `${percentage}%`,
        }}
      />
    </div>
  );
}

// ============================================================
// GENERAL CARD
// ============================================================

function GeneralCampaignCard({
  item,
}: {
  item: CampaignItem;
}) {
  const collected =
    getCollected(item);

  const percentage =
    getPercentage(item);

  const donorCount =
    getDonorsCount(item);

  return (
    <Link
      href={`/campaign/${item.slug}`}
      className="
        group
        flex
        items-center
        gap-3
        border
        border-[#dddddd]
        bg-white
        p-3
        transition
        hover:border-[#c7c7c7]
      "
    >
      <div
        className="
          aspect-[16/10]
          w-28
          shrink-0
          overflow-hidden
          bg-[#e2e2e2]
        "
      >
        <img
          src={getImage(
            item.image
          )}
          alt={item.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
            group-hover:scale-[1.03]
          "
        />
      </div>

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <h3
          className="
            line-clamp-2
            text-[13px]
            font-bold
            leading-snug
            text-[#444444]
          "
        >
          {item.title}
        </h3>

        <div
          className="
            mt-3
            flex
            items-end
            justify-between
            gap-2
          "
        >
          <div>
            <span
              className="
                block
                text-[9px]
                text-[#999999]
              "
            >
              Terkumpul
            </span>

            <strong
              className="
                text-[11px]
                font-bold
                text-[#444444]
              "
            >
              Rp{' '}
              {formatRupiah(
                collected
              )}
            </strong>
          </div>

          <div className="text-right">
            <span
              className="
                block
                text-[9px]
                text-[#999999]
              "
            >
              Donatur
            </span>

            <strong
              className="
                text-[11px]
                text-[#444444]
              "
            >
              {donorCount}
            </strong>
          </div>
        </div>

        <div className="mt-2">
          <ProgressBar
            percentage={
              percentage
            }
          />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// MENDESAK CARD
// ============================================================

function UrgentCampaignCard({
  item,
}: {
  item: CampaignItem;
}) {
  const collected =
    getCollected(item);

  const percentage =
    getPercentage(item);

  const donorCount =
    getDonorsCount(item);

  return (
    <Link
      href={`/campaign/${item.slug}`}
      className="
        group
        block
        border
        border-[#dddddd]
        bg-[#fafafa]
        p-3
        transition
        hover:border-[#c7c7c7]
        hover:bg-white
      "
    >
      <div
        className="
          relative
          aspect-[16/10]
          overflow-hidden
          bg-[#e2e2e2]
        "
      >
        <img
          src={getImage(
            item.image
          )}
          alt={item.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
            group-hover:scale-[1.03]
          "
        />

        {typeof item.daysLeft ===
          'number' &&
          item.daysLeft > 0 && (
            <span
              className="
                absolute
                left-2
                top-2
                flex
                items-center
                gap-1
                bg-[#555555]
                px-2
                py-1
                text-[8px]
                font-bold
                text-white
              "
            >
              <Clock3
                className="
                  h-3
                  w-3
                "
              />

              {item.daysLeft} hari
            </span>
          )}
      </div>

      <div className="mt-2.5">

        {item.category && (
          <p
            className="
              mb-1
              text-[8px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-[#999999]
            "
          >
            {item.category}
          </p>
        )}

        <h3
          className="
            line-clamp-2
            text-[13px]
            font-bold
            leading-snug
            text-[#424242]
          "
        >
          {item.title}
        </h3>

        <div
          className="
            mt-3
            flex
            items-end
            justify-between
          "
        >
          <strong
            className="
              text-[11px]
              text-[#444444]
            "
          >
            Rp{' '}
            {formatRupiah(
              collected
            )}
          </strong>

          <span
            className="
              inline-flex
              items-center
              gap-1
              text-[10px]
              text-[#777777]
            "
          >
            <Users
              className="
                h-3
                w-3
              "
            />

            {donorCount}
          </span>
        </div>

        <div className="mt-2">
          <ProgressBar
            percentage={
              percentage
            }
          />
        </div>

      </div>
    </Link>
  );
}

// ============================================================
// PROGRAM UNGGULAN CARD
//
// INI YANG DIPERBAIKI.
//
// Tidak aspect-square.
// Tidak flex-col.
// Tidak mt-auto.
// Tidak min-height besar.
// Tidak memaksa card tinggi.
//
// Struktur mengikuti prinsip kode pembanding:
// image 16:10 → kategori → judul → statistik → progress.
// ============================================================

function FeaturedCampaignCard({
  item,
}: {
  item: CampaignItem;
}) {
  const collected =
    getCollected(item);

  const percentage =
    getPercentage(item);

  const donorCount =
    getDonorsCount(item);

  return (
    <Link
      href={`/campaign/${item.slug}`}
      className="
        group
        block
        min-w-0
        border
        border-[#d9d9d9]
        bg-[#fafafa]
        p-2.5
        transition
        hover:border-[#bdbdbd]
        hover:bg-white
      "
    >
      {/* IMAGE LANDSCAPE - BUKAN KOTAK */}
      <div
        className="
          aspect-[16/10]
          w-full
          overflow-hidden
          bg-[#e2e2e2]
        "
      >
        <img
          src={getImage(
            item.image
          )}
          alt={item.title}
          loading="lazy"
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
            group-hover:scale-[1.025]
          "
        />
      </div>

      {/* CATEGORY */}
      {item.category && (
        <p
          className="
            mt-2.5
            truncate
            text-[8px]
            font-bold
            uppercase
            tracking-[0.15em]
            text-[#9b9b9b]
          "
        >
          {item.category}
        </p>
      )}

      {/* TITLE */}
      <h3
        className="
          mt-1
          line-clamp-2
          text-[13px]
          font-bold
          leading-[1.3]
          text-[#404040]
          transition-colors
          group-hover:text-[#073f2e]
        "
      >
        {item.title}
      </h3>

      {/* DATA */}
      <div
        className="
          mt-3
          flex
          items-end
          justify-between
          gap-1.5
        "
      >
        <div className="min-w-0">

          <span
            className="
              block
              text-[8px]
              leading-none
              text-[#999999]
            "
          >
            Terkumpul
          </span>

          <strong
            className="
              mt-1
              block
              truncate
              text-[11px]
              font-bold
              leading-tight
              text-[#444444]
            "
          >
            Rp{' '}
            {formatRupiah(
              collected
            )}
          </strong>

        </div>

        <div
          className="
            shrink-0
            text-right
          "
        >

          <span
            className="
              block
              text-[8px]
              leading-none
              text-[#999999]
            "
          >
            Donatur
          </span>

          <span
            className="
              mt-1
              inline-flex
              items-center
              gap-1
              text-[10px]
              font-semibold
              leading-tight
              text-[#555555]
            "
          >
            <Users
              className="
                h-3
                w-3
              "
            />

            {donorCount}
          </span>

        </div>
      </div>

      {/* PROGRESS */}
      <div className="mt-2.5">
        <ProgressBar
          percentage={
            percentage
          }
        />
      </div>
    </Link>
  );
}

// ============================================================
// COMPACT / PILIHAN
// ============================================================

function CompactCampaignCard({
  item,
}: {
  item: CampaignItem;
}) {
  const collected =
    getCollected(item);

  const donorCount =
    getDonorsCount(item);

  return (
    <Link
      href={`/campaign/${item.slug}`}
      className="
        group
        flex
        items-center
        gap-3
        border-b
        border-[#e1e1e1]
        pb-3.5
        transition
        last:border-b-0
        last:pb-0
      "
    >
      <div
        className="
          aspect-[16/10]
          w-28
          shrink-0
          overflow-hidden
          bg-[#dedede]
        "
      >
        <img
          src={getImage(
            item.image
          )}
          alt={item.title}
          className="
            h-full
            w-full
            object-cover
            transition-transform
            duration-300
            group-hover:scale-[1.03]
          "
        />
      </div>

      <div
        className="
          min-w-0
          flex-1
        "
      >
        {item.category && (
          <p
            className="
              mb-1
              text-[8px]
              font-bold
              uppercase
              tracking-[0.13em]
              text-[#999999]
            "
          >
            {item.category}
          </p>
        )}

        <h3
          className="
            line-clamp-2
            text-[13px]
            font-bold
            leading-snug
            text-[#494949]
          "
        >
          {item.title}
        </h3>

        <div
          className="
            mt-3
            flex
            items-end
            justify-between
            gap-2
          "
        >
          <div>
            <span
              className="
                block
                text-[8px]
                text-[#999999]
              "
            >
              Terkumpul
            </span>

            <strong
              className="
                text-[11px]
                text-[#555555]
              "
            >
              Rp{' '}
              {formatRupiah(
                collected
              )}
            </strong>
          </div>

          <div className="text-right">

            <span
              className="
                block
                text-[8px]
                text-[#999999]
              "
            >
              Donatur
            </span>

            <strong
              className="
                text-[11px]
                text-[#555555]
              "
            >
              {donorCount}
            </strong>

          </div>
        </div>
      </div>

      <ArrowRight
        className="
          h-3.5
          w-3.5
          shrink-0
          text-[#bdbdbd]
        "
      />
    </Link>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function Campaign({
  initialData = [],
  mendesak = [],
  unggulan = [],
  pilihan = [],
}: CampaignProps) {

  // ==========================================================
  // GENERAL MODE
  // ==========================================================

  if (
    initialData.length > 0 &&
    mendesak.length === 0 &&
    unggulan.length === 0 &&
    pilihan.length === 0
  ) {
    return (
      <section
        className="
          w-full
          space-y-4
          text-left
        "
      >
        <div
          className="
            border-b
            border-[#d5d5d5]
            pb-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2.5
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                border
                border-[#d0d0d0]
                bg-[#e5e5e5]
              "
            >
              <HeartHandshake
                className="
                  h-4
                  w-4
                  text-[#666666]
                "
              />
            </div>

            <div>
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-[#888888]
                "
              >
                Program Kebaikan
              </p>

              <h2
                className="
                  mt-0.5
                  text-[18px]
                  font-bold
                  text-[#414141]
                "
              >
                Daftar Program
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {initialData.map(
            (item) => (
              <GeneralCampaignCard
                key={item.id}
                item={item}
              />
            )
          )}
        </div>
      </section>
    );
  }

  // ==========================================================
  // HOMEPAGE
  // ==========================================================

  return (
    <div
      className="
        w-full
        space-y-6
        text-left
      "
    >

      {/* ======================================================
          MENDESAK
      ====================================================== */}

      {mendesak.length >
        0 && (
        <section
          className="
            space-y-4
            border
            border-[#d8d8d8]
            bg-white
            p-4
            shadow-[0_3px_12px_rgba(0,0,0,0.025)]
          "
        >
          <SectionHeader
            eyebrow="Butuh Dukungan Segera"
            title="Penggalangan Dana Mendesak"
            description="Bantu program yang membutuhkan dukungan segera agar manfaat dapat tersalurkan lebih cepat."
            href="/campaign/mendesak"
          />

          <div
            className="
              grid
              grid-cols-2
              gap-3
              pt-1
            "
          >
            {mendesak.map(
              (item) => (
                <UrgentCampaignCard
                  key={item.id}
                  item={item}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ======================================================
          PROGRAM UNGGULAN
      ====================================================== */}

      {unggulan.length >
        0 && (
        <section
          className="
            space-y-4
            border
            border-[#d8d8d8]
            bg-white
            p-4
            shadow-[0_3px_12px_rgba(0,0,0,0.025)]
          "
        >
          <SectionHeader
            eyebrow="Rekomendasi Program"
            title="Program Unggulan"
            description="Pilih program yang berarti bagi Anda dan Mereka"
            href="/campaign/unggulan"
          />

          {/* SELALU 2 KOLOM, TERMASUK MOBILE */}
          <div
            className="
              grid
              grid-cols-2
              items-start
              gap-3
              pt-1
            "
          >
            {unggulan.map(
              (item) => (
                <FeaturedCampaignCard
                  key={item.id}
                  item={item}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ======================================================
          PILIHAN
      ====================================================== */}

      {pilihan.length >
        0 && (
        <section
          className="
            space-y-4
            border
            border-[#d8d8d8]
            bg-white
            p-4
            shadow-[0_3px_12px_rgba(0,0,0,0.025)]
          "
        >
          <SectionHeader
            eyebrow="Pilihan Kebaikan"
            title="Program Pilihan"
            description="Temukan program kebaikan lainnya yang dapat menjadi jalan untuk berbagi dan menghadirkan manfaat."
            href="/campaign/pilihan"
          />

          <div
            className="
              space-y-3.5
              pt-1
            "
          >
            {pilihan.map(
              (item) => (
                <CompactCampaignCard
                  key={item.id}
                  item={item}
                />
              )
            )}
          </div>
        </section>
      )}

    </div>
  );
}