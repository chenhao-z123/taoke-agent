import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { spreadsheetBufferToRawText } from "../../src/lib/import/spreadsheet-import";

describe("spreadsheetBufferToRawText", () => {
  it("converts the first worksheet into pipe-delimited timetable text", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["课程名", "时间段", "周次", "地点"],
      ["高等数学", "周一 08:00-09:35", "1-16周", "A101"],
      ["大学英语", "周三 10:00-11:35", "1-16周", "B203"]
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const rawText = spreadsheetBufferToRawText(buffer);

    expect(rawText).toContain("课程名 | 时间段 | 周次 | 地点");
    expect(rawText).toContain("高等数学 | 周一 08:00-09:35 | 1-16周 | A101");
    expect(rawText).toContain("大学英语 | 周三 10:00-11:35 | 1-16周 | B203");
  });

  it("skips blank rows and trims empty trailing cells", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["课程名", "时间段", "地点", "备注"],
      ["操作系统", "周二 14:00-15:35", "机房", ""],
      [],
      ["", "", "", ""],
      ["编译原理", "周四 10:00-11:35", "Room 402", undefined]
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const rawText = spreadsheetBufferToRawText(buffer);

    expect(rawText.split("\n")).toEqual([
      "课程名 | 时间段 | 地点 | 备注",
      "操作系统 | 周二 14:00-15:35 | 机房",
      "编译原理 | 周四 10:00-11:35 | Room 402"
    ]);
  });
});
