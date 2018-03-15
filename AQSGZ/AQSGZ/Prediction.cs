using System.Drawing;
using System.Windows.Forms.DataVisualization.Charting;
using System;

namespace AQSGZ
{
    public class Prediction
    {
        #region  字段

        double[] sourceData_X = new double[0];  // 样本数据 X 轴坐标值
        double[] sourceData_Y = new double[0];  // 样本数据 Y 轴坐标值

        double[] predictData_Y = new double[0]; // 预测的未来数据的 Y 轴坐标值
        int n = 0;		      // 样本数据的个数

        // Chart
        System.Windows.Forms.DataVisualization.Charting.Chart chart_temp = new System.Windows.Forms.DataVisualization.Charting.Chart();

        #endregion 字段

        /// <summary>
        /// 构造函数
        /// </summary>
        public Prediction(double[] data_x, double[] data_y)
        {
            n = data_x.Length;
            Array.Resize(ref sourceData_X, data_x.Length);
            Array.Resize(ref sourceData_Y, data_y.Length);

            for (int i = 0; i < n; i++)
            {
                sourceData_X[i] = data_x[i];
                sourceData_Y[i] = data_y[i];
            }

            InitialChart(chart_temp, sourceData_X, sourceData_Y);
        }

        // 初始化 Chart 控件
        private void InitialChart(System.Windows.Forms.DataVisualization.Charting.Chart chart, double[] data_x, double[] data_y)
        {
            #region  1. Title 设置
            Title title = new Title();  //* 实例化
            title.Text = "信息预测";
            //** 关联
            chart.Titles.Add(title);  //* 当使用这种重载方式时，可以将属性传递
            #endregion

            #region 2. ChartArea 设置
            ChartArea chartarea1 = new ChartArea();  //* 实例化
            chartarea1.Name = "chartarea1";     //* ChartArea 的唯一名称
            // 关联
            chart.ChartAreas.Add(chartarea1);  //重要//使用这种重载方法
            #endregion

            #region 3. 坐标轴设置
            #region  3.1 X轴
            Axis axis_X = new Axis();
            axis_X.IntervalType = DateTimeIntervalType.Days;
            axis_X.Title = "时 间";  //* 轴的标题
            // ** 关联
            chart.ChartAreas[0].AxisX = axis_X;
            chart.ChartAreas[0].AxisX.Enabled = AxisEnabled.True;
            #endregion

            #region   3.2.1  深度 -- Y 轴
            Axis axisY_depth = new Axis();
            axisY_depth.Title = "深度";
            axisY_depth.LineColor = Color.Black;
            axisY_depth.ArrowStyle = AxisArrowStyle.None;
            axisY_depth.TextOrientation = TextOrientation.Stacked;
            axisY_depth.TitleFont = new Font("微软雅黑", 14F, FontStyle.Bold);
            axisY_depth.TitleForeColor = Color.Black;
            axisY_depth.TitleAlignment = StringAlignment.Far;
            axisY_depth.IsLabelAutoFit = false;

            axisY_depth.IntervalType = DateTimeIntervalType.Number;
            axisY_depth.IsStartedFromZero = false;
            axisY_depth.Minimum = 0;
            axisY_depth.Maximum = 10;
            axisY_depth.IntervalAutoMode = IntervalAutoMode.FixedCount;
            axisY_depth.InterlacedColor = Color.Red;

            // ** 关联
            chart.ChartAreas[0].AxisY = axisY_depth;
            chart.ChartAreas[0].AxisY.Enabled = AxisEnabled.True;
            #endregion

            #endregion

            #region 4. Series 设置

            Series series = new Series();
            series.Name = "样本数据曲线";
            series.ChartType = SeriesChartType.Line;
            series.XAxisType = AxisType.Primary;
            series.YAxisType = AxisType.Primary;
            // important
            series.XValueType = ChartValueType.DateTime;
            series.YValueType = ChartValueType.Double;
            series.Enabled = true;

            //关联
            series.ChartArea = chart.ChartAreas[0].Name;
            chart.Series.Clear();
            chart.Series.Add(series);  // 注意要使用这个重载方法，不应该使用 Add（string）重载方法
            #endregion

            #region 5. Points 设置

            // 清除所有数据点
            chart.Series[0].Points.Clear();

            // 添加数据点
            int m = data_x.Length;
            for (int i = 0; i < m; i++)
            {
                chart.Series[0].Points.AddXY(data_x[i], data_y[i]);
            }
            #endregion
        }

        /// <summary>
        /// 得到基于回归分析预测的数据
        /// </summary>
        /// 
        public double[] GetPredictData(int days)
        {
            Array.Resize(ref predictData_Y, sourceData_Y.Length + days);

            Series trendSeries = new Series();
            trendSeries.Name = "trend";
            trendSeries.ChartType = SeriesChartType.Line;

            // 关联
            trendSeries.ChartArea = chart_temp.ChartAreas[0].Name;
            chart_temp.Series.Add(trendSeries);

            string typeRegression = "4";
            // The number of days for Forecasting (备注：该数字对应的单位与X轴的数据间隔单位有关，并不一定是“天”)
            string forecasting = days.ToString();
            string error = "false";
            string forecastingError = "false";
            string parameters = typeRegression + ',' + forecasting + ',' + error + ',' + forecastingError;

            chart_temp.DataManipulator.FinancialFormula(FinancialFormula.Forecasting, parameters, chart_temp.Series[0], chart_temp.Series["trend"]);


            for (int i = 0; i < predictData_Y.Length; i++)  // 共4个预测值
            {
                predictData_Y[i] = Math.Round(chart_temp.Series["trend"].Points[i].YValues[0], 5);   // chart.Series["trend"]共8个数据点
            }

            return predictData_Y;
        }
    }
}