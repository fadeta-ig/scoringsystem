"use client";

import NumberFlow from "@number-flow/react";
import type { ComponentProps } from "react";

type NumberFlowProps = ComponentProps<typeof NumberFlow>;

type AnimatedNumberProps = {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  format?: NumberFlowProps["format"];
  locales?: NumberFlowProps["locales"];
  trend?: NumberFlowProps["trend"];
};

const integerFormat: NonNullable<NumberFlowProps["format"]> = {
  maximumFractionDigits: 0,
};

export function AnimatedNumber({
  value,
  className,
  prefix,
  suffix,
  format = integerFormat,
  locales = "id-ID",
  trend,
}: AnimatedNumberProps) {
  return (
    <NumberFlow
      className={className}
      format={format}
      locales={locales}
      prefix={prefix}
      respectMotionPreference
      suffix={suffix}
      trend={trend}
      value={value}
    />
  );
}

export function AnimatedSignedNumber({
  value,
  className,
  format = integerFormat,
  locales = "id-ID",
}: Pick<AnimatedNumberProps, "value" | "className" | "format" | "locales">) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  return (
    <AnimatedNumber
      className={className}
      format={format}
      locales={locales}
      prefix={prefix}
      value={Math.abs(value)}
    />
  );
}
