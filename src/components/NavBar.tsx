import Link from "next/link";

export function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="font-bold text-gray-900 text-lg">
        議事録管理
      </Link>
      <Link href="/meetings" className="text-gray-600 hover:text-gray-900 text-sm">
        会議一覧
      </Link>
      <Link href="/meetings/new" className="text-gray-600 hover:text-gray-900 text-sm">
        会議登録
      </Link>
      <Link href="/projects" className="text-gray-600 hover:text-gray-900 text-sm">
        案件一覧
      </Link>
    </nav>
  );
}
