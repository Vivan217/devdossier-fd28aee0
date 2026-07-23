import { jsPDF } from "jspdf";
import type { Profile, TopLanguage, TopRepo } from "@/services/devdossier";
import { getFeaturedRepos, sortReposByFeatured } from "@/services/devdossier";

async function loadAvatar(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateResumePdf(profile: Profile, publicUrl: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Accent header bar
  doc.setFillColor(30, 111, 255);
  doc.rect(0, 0, pageW, 96, "F");

  // Avatar
  const avatar = await loadAvatar(profile.avatar_url);
  if (avatar) {
    try {
      doc.addImage(avatar, "JPEG", margin, 28, 64, 64);
    } catch {
      // ignore image errors
    }
  }

  // Name + handle in header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(profile.name || profile.github_username, margin + 80, 55);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`@${profile.github_username}   ·   github.com/${profile.github_username}`, margin + 80, 74);

  let y = 128;
  doc.setTextColor(30, 30, 30);

  // Bio
  if (profile.bio) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(90, 90, 90);
    const bio = doc.splitTextToSize(profile.bio, contentW);
    doc.text(bio, margin, y);
    y += bio.length * 13 + 6;
  }

  const section = (title: string) => {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, margin + contentW, y);
    y += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 111, 255);
    doc.text(title.toUpperCase(), margin, y);
    y += 16;
    doc.setTextColor(30, 30, 30);
  };

  // Stats row
  section("GitHub Stats");
  const stats: [string, string][] = [
    ["Repos", String(profile.public_repos)],
    ["Stars", String(profile.total_stars)],
    ["Followers", String(profile.followers)],
    ["Following", String(profile.following)],
  ];
  const colW = contentW / stats.length;
  stats.forEach(([label, val], i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(val, cx, y + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(label, cx, y + 22, { align: "center" });
    doc.setTextColor(30, 30, 30);
  });
  y += 40;

  // AI summary
  if (profile.ai_summary) {
    section("Summary");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(profile.ai_summary, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 6;
  }

  // Languages
  const langs = (profile.top_languages as unknown as TopLanguage[]) || [];
  if (langs.length) {
    section("Skills");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const label = langs.map((l) => `${l.name} (${l.count})`).join("   ·   ");
    const wrapped = doc.splitTextToSize(label, contentW);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 13 + 6;
  }

  // Top repos
  const allRepos = (profile.top_repos as unknown as TopRepo[]) || [];
  const featured = getFeaturedRepos(profile);
  const featuredMap = new Map(featured.map((f) => [f.name, f]));
  const repos = sortReposByFeatured(allRepos, featured).slice(0, 5);
  if (repos.length) {
    section("Key Projects");
    doc.setFontSize(10.5);
    for (const r of repos) {
      if (y > 720) break; // keep single page
      const feat = featuredMap.get(r.name);
      doc.setFont("helvetica", "bold");
      if (feat) {
        doc.setTextColor(30, 111, 255);
        doc.text(`★ ${r.name}`, margin, y);
      } else {
        doc.setTextColor(30, 30, 30);
        doc.text(r.name, margin, y);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      const meta = `${r.language ? r.language + " · " : ""}★ ${r.stars} · ⑃ ${r.forks}`;
      doc.text(meta, margin + contentW, y, { align: "right" });
      y += 13;
      if (feat?.blurb) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(30, 111, 255);
        const b = doc.splitTextToSize(feat.blurb, contentW);
        doc.text(b, margin, y);
        y += b.length * 12;
        doc.setFont("helvetica", "normal");
      }
      if (r.description) {
        doc.setTextColor(80, 80, 80);
        const d = doc.splitTextToSize(r.description, contentW);
        doc.text(d.slice(0, 2), margin, y);
        y += Math.min(d.length, 2) * 12;
      }
      doc.setTextColor(30, 111, 255);
      doc.setFontSize(9);
      doc.text(r.url, margin, y);
      doc.setFontSize(10.5);
      y += 16;
    }
  }

  // Footer link
  const footerY = doc.internal.pageSize.getHeight() - 32;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 12, margin + contentW, footerY - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Full dossier:", margin, footerY);
  doc.setTextColor(30, 111, 255);
  doc.text(publicUrl, margin + 58, footerY);
  doc.setTextColor(160, 160, 160);
  doc.text("Generated with DevDossier", margin + contentW, footerY, { align: "right" });

  doc.save(`${profile.github_username}-devdossier.pdf`);
}