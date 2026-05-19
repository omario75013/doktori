// Parse `?page=N&pageSize=M` from a Next.js `searchParams` and clamp values
// to a safe range so we never blow up the page or the DB with absurd numbers.

export type PageParams = {
  page: number;
  pageSize: number;
  offset: number;
};

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [25, 50, 100, 200];
const MAX_PAGE = 10_000;

export function parsePageParams(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  defaults: { pageSize?: number } = {},
): PageParams {
  const sp = searchParams ?? {};
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const rawSize = Array.isArray(sp.pageSize) ? sp.pageSize[0] : sp.pageSize;

  let page = Number.parseInt(rawPage ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;

  let pageSize = Number.parseInt(rawSize ?? "", 10);
  if (!ALLOWED_PAGE_SIZES.includes(pageSize)) {
    pageSize = defaults.pageSize ?? DEFAULT_PAGE_SIZE;
  }

  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export { ALLOWED_PAGE_SIZES, DEFAULT_PAGE_SIZE };
