export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="container mx-auto py-8 text-center text-sm text-muted-foreground">
        Built with care · DevDossier © {new Date().getFullYear()}
      </div>
    </footer>
  );
}
