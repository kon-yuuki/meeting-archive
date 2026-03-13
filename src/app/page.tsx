import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">議事録管理システム</h1>
      <p className="text-gray-500 mb-8">クライアントMTGの録音・文字起こし・要約を一元管理</p>
      <div className="flex justify-center gap-4">
        <Link
          href="/meetings"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium"
        >
          会議一覧を見る
        </Link>
        <Link
          href="/meetings/new"
          className="bg-white text-blue-600 border border-blue-600 px-6 py-2.5 rounded-lg hover:bg-blue-50 font-medium"
        >
          会議を登録する
        </Link>
      </div>
    </div>
  );
}
