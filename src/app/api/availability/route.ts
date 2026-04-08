import { NextRequest, NextResponse } from "next/server";
import { MOCK_AVAILABILITY, MOCK_BOOKED_DATES } from "@/lib/mock-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!date || !serviceId) {
    return NextResponse.json({ error: "Data e ID do serviço são obrigatórios" }, { status: 400 });
  }

  const db = process.env.DATABASE_URL;

  if (!db) {

    const d = new Date(date);
    if (d.getDay() === 0) {
      return NextResponse.json([]);
    }

    if (MOCK_BOOKED_DATES.includes(date)) {
      return NextResponse.json([]);
    }

    const {
      SETTINGS: currentSettings,
      MOCK_AVAILABILITY_30,
      MOCK_AVAILABILITY_45,
      MOCK_AVAILABILITY_60
    } = require("@/lib/mock-store");
    
    const daysMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = daysMap[d.getDay()];
    const daySettings = currentSettings.weeklyHours?.[dayName] || { start: "00:00", end: "00:00", active: false };

    if (!daySettings.active) {
      return NextResponse.json([]);
    }

    const { slotInterval } = currentSettings;
    const businessStartTime = daySettings.start;
    const businessEndTime = daySettings.end;

    let availabilityList = MOCK_AVAILABILITY_45;
    if (slotInterval === 30) availabilityList = MOCK_AVAILABILITY_30;
    if (slotInterval === 60) availabilityList = MOCK_AVAILABILITY_60;

    console.log(`Filtering availability for ${date} (${dayName}) between ${businessStartTime} and ${businessEndTime}`);

    const slots = availabilityList.filter((time: string) => {
      const paddedTime = time.padStart(5, "0");
      const paddedStart = (businessStartTime).padStart(5, "0");
      const paddedEnd = (businessEndTime).padStart(5, "0");

      return paddedTime >= paddedStart && paddedTime <= paddedEnd;
    }).map((time: string) => {

      const isBusy = (time === "09:00" && date.endsWith("02")) || (time === "14:30" && date.endsWith("05"));
      return {
        time,
        available: !isBusy
      };
    });

    console.log(`Returning ${slots.length} slots`);
    return NextResponse.json(slots);
  }

  return NextResponse.json(MOCK_AVAILABILITY.map(t => ({ time: t, available: true })));
}
