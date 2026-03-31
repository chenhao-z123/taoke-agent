"use client";

import React, { useMemo, useState, useTransition } from "react";

import { spreadsheetBufferToRawText } from "@/lib/import/spreadsheet-import";
import type { TimetableExtractionResult } from "@/lib/schema/extraction";
import type { TimetableCourseInput, TimetableImportInput } from "@/lib/types/input";

type ImportFormProps = {
  initialCourses: TimetableCourseInput[];
  initialParseResult?: TimetableExtractionResult | null;
  pendingOverride?: boolean;
  debugRawOutput?: boolean;
  onExtractAction: (input: {
    raw_text: string;
    related_context?: string;
    image_data_url?: string;
  }) => Promise<TimetableExtractionResult>;
  onSaveAction: (
    input: TimetableImportInput
  ) => Promise<{ courses: TimetableCourseInput[] }>;
};

export default function ImportForm({
  initialCourses,
  initialParseResult,
  pendingOverride,
  debugRawOutput,
  onExtractAction,
  onSaveAction
}: ImportFormProps) {
  const dayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const [rawText, setRawText] = useState("");
  const [relatedContext, setRelatedContext] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<TimetableExtractionResult | null>(
    initialParseResult ?? null
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startParsingTransition] = useTransition();
  const [isSavingPending, startSavingTransition] = useTransition();

  const previewCourses = useMemo(
    () => parseResult?.courses ?? [],
    [parseResult]
  );

  const malformedRows = useMemo(
    () => parseResult?.malformed_rows ?? [],
    [parseResult]
  );

  const parseWarnings = useMemo(
    () => parseResult?.warnings ?? [],
    [parseResult]
  );

  const debugRawOutputText = debugRawOutput ? parseResult?.raw_output : undefined;

  const isParsingPending = pendingOverride ?? isPending;
  const isBusy = isParsingPending || isSavingPending;
  const hasParseResult = Boolean(parseResult);
  const parseStatus = isParsingPending
    ? "智能解析进行中，请稍候。"
    : hasParseResult
      ? previewCourses.length > 0
        ? `解析完成，识别到 ${previewCourses.length} 门课程。`
        : "解析完成，但未识别到课程。"
      : "上传课表文本或截图后点击智能解析预览。";

  const loadImageFile = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("invalid image"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("read error"));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    loadImageFile(file)
      .then((dataUrl) => setImageDataUrl(dataUrl))
      .catch(() => setErrorMessage("截图读取失败，请重试。"));

    event.target.value = "";
  };

  const handleSpreadsheetUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const convertedText = spreadsheetBufferToRawText(arrayBuffer);

      if (!convertedText.trim()) {
        setErrorMessage("表格中未读取到可导入内容，请检查后重试。");
        return;
      }

      setRawText(convertedText);
    } catch {
      setErrorMessage("表格读取失败，请检查文件格式后重试。");
    } finally {
      event.target.value = "";
    }
  };

  const handlePasteImage = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    const imageItem = Array.from(items).find((item) =>
      item.type.startsWith("image/")
    );

    if (!imageItem) {
      setErrorMessage("未检测到截图，请粘贴图片。");
      return;
    }

    event.preventDefault();

    const file = imageItem.getAsFile();
    if (!file) {
      setErrorMessage("截图读取失败，请重试。");
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    loadImageFile(file)
      .then((dataUrl) => setImageDataUrl(dataUrl))
      .catch(() => setErrorMessage("截图读取失败，请重试。"));
  };

  const handleParse = () => {
    setErrorMessage(null);
    setSaveMessage(null);

    if (!rawText.trim() && !imageDataUrl) {
      setErrorMessage("请先输入课表文本或上传截图，再进行智能解析。");
      return;
    }

    startParsingTransition(async () => {
      try {
        const result = await onExtractAction({
          raw_text: rawText,
          related_context: relatedContext.trim() || undefined,
          image_data_url: imageDataUrl ?? undefined
        });
        setParseResult(result);
      } catch (error) {
        if (error instanceof Error && error.message) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("智能解析失败，请调整文本后重试。");
        }
      }
    });
  };

  const handleSave = () => {
    if (!parseResult || previewCourses.length === 0) {
      setErrorMessage("请至少先解析出一门课程再保存。");
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    startSavingTransition(async () => {
      try {
        await onSaveAction({ courses: previewCourses });
        setSaveMessage("课表已保存。");
      } catch (error) {
        setErrorMessage("课表保存失败，请检查字段后重试。");
      }
    });
  };

  return (
    <div className="card">
      <div className="section-title">
        <h2>粘贴课表</h2>
        <p>
          每门课程占一行，列之间请使用竖线分隔，并包含星期/时间与周次范围。
        </p>
      </div>

      <div className="form-grid" style={{ marginTop: "18px" }}>
        <div className="form-row">
          <label htmlFor="timetable-screenshot">上传课表截图</label>
          <input
            id="timetable-screenshot"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <p className="helper-text">
            {imageDataUrl
              ? "已准备 1 张截图，可继续替换。"
              : "支持单张课表截图上传。"}
          </p>
        </div>
        <div className="form-row">
          <label htmlFor="timetable-sheet">上传 Excel / CSV</label>
          <input
            id="timetable-sheet"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleSpreadsheetUpload}
          />
          <p className="helper-text">
            支持教务导出的 Excel/CSV，读取后会自动填入下方课表文本。
          </p>
        </div>
        <div className="form-row">
          <label>粘贴截图</label>
          <div
            className="panel"
            role="textbox"
            tabIndex={0}
            aria-label="粘贴课表截图"
            onPaste={handlePasteImage}
          >
            <p className="helper-text">
              点击此处后使用 Ctrl+V / ⌘+V 粘贴截图。
            </p>
          </div>
        </div>
      </div>

      <div className="form-row" style={{ marginTop: "18px" }}>
        <label htmlFor="timetable-text">课表文本</label>
        <textarea
          id="timetable-text"
          placeholder="课程名 | 周一 09:00-10:30, 周三 13:00-14:30 | 第1-12周 | 101教室 | 李老师 | 3学分"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
        />
        <p className="helper-text">
          期望列顺序：课程名 | 时间段 | 周次范围 | 地点 | 教师 | 课程类型/学分。
        </p>
      </div>

      <div className="form-row" style={{ marginTop: "12px" }}>
        <label htmlFor="related-context">原始补充说明</label>
        <textarea
          id="related-context"
          placeholder="可粘贴补充说明，例如老师备注、教务说明或截图转写内容。"
          value={relatedContext}
          onChange={(event) => setRelatedContext(event.target.value)}
        />
      </div>

      <div className="button-row">
        <button
          className="button secondary"
          type="button"
          onClick={handleParse}
          disabled={isBusy}
        >
          智能解析预览
        </button>
        <button
          className="button"
          type="button"
          onClick={handleSave}
          disabled={isBusy}
        >
          保存导入课程
        </button>
      </div>

      <div className="panel" style={{ marginTop: "16px" }} aria-live="polite">
        <strong>解析状态</strong>
        <p className="helper-text" style={{ marginTop: "8px" }}>
          {parseStatus}
        </p>
        {parseWarnings.length > 0 ? (
          <div className="notice" style={{ marginTop: "12px" }}>
            <strong>解析提示</strong>
            <ul>
              {parseWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {errorMessage ? <div className="notice">{errorMessage}</div> : null}
      {saveMessage ? <div className="success">{saveMessage}</div> : null}

      {malformedRows.length > 0 ? (
        <div className="notice">
          <strong>格式异常的行</strong>
          <ul>
            {malformedRows.map((row, index) => (
              <li key={`${row.row}-${index}`}>
                {row.row} ({row.reason})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {debugRawOutputText ? (
        <div style={{ marginTop: "16px" }}>
          <strong>最终原始输出</strong>
          <pre>{debugRawOutputText}</pre>
        </div>
      ) : null}

      <div style={{ marginTop: "24px" }}>
        <h3>智能解析预览</h3>
        {previewCourses.length === 0 ? (
          <p className="helper-text">当前还没有解析出的课程。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                 <th>课程</th>
                 <th>时间段</th>
                 <th>周次</th>
                 <th>地点</th>
              </tr>
            </thead>
            <tbody>
              {previewCourses.map((course) => (
                <tr key={`${course.course_name}-${course.time_slots[0]?.time}`}>
                  <td>{course.course_name}</td>
                  <td>
                    {course.time_slots
                      .map((slot) => {
                        const label = dayLabels[slot.day_of_week] ?? "星期";
                        return `${label} ${slot.time}`;
                      })
                      .join(", ")}
                  </td>
                  <td>
                    {course.week_range
                       ? `第 ${course.week_range.start_week}-${course.week_range.end_week} 周`
                       : "-"}
                  </td>
                  <td>{course.location ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: "24px" }}>
        <h3>当前已保存课程</h3>
        {initialCourses.length === 0 ? (
          <p className="helper-text">暂时还没有已保存的导入内容。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                 <th>课程</th>
                 <th>课次数</th>
                 <th>周次</th>
              </tr>
            </thead>
            <tbody>
              {initialCourses.map((course) => (
                <tr key={`${course.course_name}-${course.time_slots[0]?.time}`}>
                  <td>{course.course_name}</td>
                  <td>{course.time_slots.length}</td>
                  <td>
                    {course.week_range
                      ? `${course.week_range.start_week}-${course.week_range.end_week}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
