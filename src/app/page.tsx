import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="section-title">
          <span className="badge">MVP 录入流程</span>
          <h1>校园能耗优化器</h1>
          <p>
            以清晰、平稳的方式录入课表、个人偏好与课程细节。规划器会基于
            这些信息，在后续生成你的第一版可执行计划。
          </p>
          <div className="button-row">
            <Link className="button" href="/import">
              开始录入流程
            </Link>
            <Link className="button secondary" href="/profile">
              直接前往偏好设置
            </Link>
          </div>
        </div>
        <div>
          <div className="flow-grid">
            <div className="flow-card">
              <span>01 导入</span>
              <h3>粘贴课表</h3>
              <p>先解析课程时段，再修正格式异常的行后保存。</p>
            </div>
            <div className="flow-card">
              <span>02 偏好</span>
              <h3>设定策略</h3>
              <p>定义风险偏好、规划模式与替代出勤倾向。</p>
            </div>
            <div className="flow-card">
              <span>03 阶段</span>
              <h3>学期语境</h3>
              <p>按本学期情况调整默认阶段模板。</p>
            </div>
            <div className="flow-card">
              <span>04 课程</span>
              <h3>补充课程细节</h3>
              <p>标记必须出勤课次与出勤约束条件。</p>
            </div>
            <div className="flow-card">
              <span>05 调整</span>
              <h3>短期信号</h3>
              <p>记录天气、事件，以及罕见的出勤突发情况。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>你将录入的内容</h2>
          <p>
            全流程以文本录入为主，方便快速完成。生成计划前，你可以随时返回
            任一步骤修改内容。
          </p>
        </div>
        <div className="nav-row" style={{ marginTop: "16px" }}>
          <Link href="/import">导入</Link>
          <Link href="/profile">偏好</Link>
          <Link href="/phase">阶段</Link>
          <Link href="/courses">课程</Link>
          <Link href="/adjust">调整</Link>
        </div>
      </section>
    </main>
  );
}
