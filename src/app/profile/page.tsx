import React from "react";
import Link from "next/link";

import ProfileForm from "@/components/forms/profile-form";
import { getUserProfile } from "@/lib/repo/user-profile";
import { saveProfile } from "@/server/actions/save-profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getUserProfile();

  return (
    <main className="page">
      <section className="section-title">
        <h1>偏好与设置</h1>
        <p>在进入学期阶段与课程细节前，先记录你的规划倾向。</p>
      </section>

      <div className="nav-row">
        <Link href="/import">导入</Link>
        <Link className="active" href="/profile">
          偏好
        </Link>
        <Link href="/phase">阶段</Link>
        <Link href="/courses">课程</Link>
        <Link href="/adjust">调整</Link>
      </div>

      <ProfileForm initialProfile={profile} onSaveAction={saveProfile} />

      <div className="button-row">
        <Link className="button" href="/phase">
          继续填写阶段
        </Link>
        <Link className="button ghost" href="/import">
          返回导入
        </Link>
      </div>
    </main>
  );
}
