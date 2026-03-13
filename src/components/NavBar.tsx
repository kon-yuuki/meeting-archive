"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function NavBar() {
  const { data: session } = useSession();

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
      <div className="ml-auto flex items-center gap-3">
        {session?.user && (
          <>
            <span className="text-gray-500 text-sm">{session.user.name}</span>
            {(session.user as { role?: string })?.role === "admin" && (
              <Link href="/admin" className="text-gray-500 text-xs hover:text-gray-700">
                管理
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              ログアウト
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
