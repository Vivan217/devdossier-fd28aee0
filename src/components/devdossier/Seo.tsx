import { Helmet } from "react-helmet-async";

const SITE = "https://devdossier.lovable.app";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "profile" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function Seo({ title, description, path, image, type = "website", jsonLd }: SeoProps) {
  const url = `${SITE}${path}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {image ? <meta property="og:image" content={image} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image ? <meta name="twitter:image" content={image} /> : null}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}