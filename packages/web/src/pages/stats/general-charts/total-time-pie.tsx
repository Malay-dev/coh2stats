import { ResponsivePie } from "@nivo/pie";
import React from "react";
import { StatsDataObject, statsTypesInDB } from "../../../coh/types";
import { Empty } from "antd";

interface FactionsPlayedPieChartProps {
  data: StatsDataObject;
}

export const TotalTimePieChart: React.FC<FactionsPlayedPieChartProps> = ({ data }) => {
  const chartData = [];

  if (!data || !Object.prototype.hasOwnProperty.call(data["1v1"], "gameTime")) {
    return <Empty />;
  }

  // "1v1", "2v2", "3v3" ...
  for (let type of statsTypesInDB) {
    chartData.push({
      id: type,
      label: type,
      value: (data[type].gameTime / 60 / 60).toFixed(0),
    });
  }

  return (
    <ResponsivePie
      // @ts-ignore
      data={chartData}
      margin={{ bottom: 5, top: 5, right: 10 }}
      innerRadius={0.4}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      borderWidth={1}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor="#333333"
      arcLinkLabelsThickness={2}
      arcLabelsSkipAngle={10}
      enableArcLinkLabels={false}
      legends={[
        {
          anchor: "bottom-right",
          direction: "column",
          justify: false,
          translateX: 45,
          translateY: 0,
          itemsSpacing: 5,
          itemWidth: 100,
          itemHeight: 18,
          itemTextColor: "#999",
          itemDirection: "left-to-right",
          itemOpacity: 1,
          symbolSize: 18,
          symbolShape: "circle",
          effects: [
            {
              on: "hover",
              style: {
                itemTextColor: "#000",
              },
            },
          ],
        },
      ]}
    />
  );
};
