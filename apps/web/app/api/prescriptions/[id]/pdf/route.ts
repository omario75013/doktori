import { NextResponse, type NextRequest } from "next/server";

// "Download as PDF" entry point used by patient + doctor doc cards.
//
// We don't ship a headless PDF library yet — instead redirect to the existing
// /ordonnance/[id] preview page with ?print=1, which auto-opens the browser
// print dialog. Modern browsers (Chrome/Edge/Safari/Firefox) have a built-in
// "Save as PDF" destination that produces a clean A4 PDF using our @page rules.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.redirect(
    new URL(`/ordonnance/${id}?print=1`, _req.url),
    307,
  );
}
