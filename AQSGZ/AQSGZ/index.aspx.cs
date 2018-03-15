using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace AQSGZ
{
    public partial class index : System.Web.UI.Page
    {
        private static string ConnectStr_AirQuality;

        private static string ConnectStr_AirStation;

        private static string ConnectStr_Statics;

        protected void Page_Load(object sender, EventArgs e)
        {
            ConnectStr_AirQuality = ConfigurationManager.ConnectionStrings["Air_Quality"].ConnectionString;
            ConnectStr_AirStation = ConfigurationManager.ConnectionStrings["Air_Station"].ConnectionString;
            ConnectStr_Statics = ConfigurationManager.ConnectionStrings["Air_Statistics"].ConnectionString;
        }

        /// <summary>
        /// 返回监测站坐标数据,默认返回全部数据，提供查询字段以及查询条件，默认查询全部数据
        /// </summary>
        /// <returns></returns>
        private static DataTable PriGetSocation(string QueryOpt = "*", string QueryFilter = "")
        {
            SqlConnection conn = new SqlConnection(ConnectStr_AirStation);
            conn.Open();
            string SQL = "Select " + QueryOpt + " from Location " + QueryFilter;//将监测点信息表的信息全部拿出
            SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
            DataSet ds = new DataSet();
            ada.Fill(ds);
            DataTable dt = ds.Tables[0];
            conn.Close();
            return dt;
        }

        /// <summary>
        /// 获取最新的数据表名，提供年月日小时为输出参数
        /// </summary>
        /// <param name="conn"></param>
        /// <returns></returns>
        public static string GetNewestTableName(SqlConnection conn, out string Year, out string Month, out string Day, out string Hour)
        {
            if (conn.State != ConnectionState.Open)
            {
                conn.Open();
            }

            string SQL = "Select OriTableName from DT_NewestTable";//将监测点信息表的信息全部拿出
            SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
            DataSet ds = new DataSet();
            ada.Fill(ds);
            DataTable dt = ds.Tables[0];
            string tableName = dt.Rows[0][0].ToString();
            string[] OutPar = tableName.Split('_');
            Year = OutPar[1];
            Month = OutPar[2];
            Day = OutPar[3];
            Hour = OutPar[4];
            return tableName;
        }

        /// <summary>
        /// 检查指定表是否存在，存在返回true，不存在返回false
        /// </summary>
        /// <param name="TableName"></param>
        /// <param name="conn"></param>
        /// <returns></returns>
        private static Boolean CheckTableExits(string TableName, SqlConnection conn)
        {
            string IFEXISTSQL = "select * from sys.tables where name = '" + TableName + "'";
            SqlCommand ifcn = new SqlCommand(IFEXISTSQL, conn);
            object ob = ifcn.ExecuteScalar();//若ob为null，表示该表不存在
            if (ob == null)
                return false;
            else
                return true;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="datatype"></param>
        /// <param name="C"></param>
        /// <returns></returns>
        public static double GetAQI(string datatype, double C)
        {
            double I = 0.0;
            double[] IAQI = new double[8] { 0, 50, 100, 150, 200, 300, 400, 500 };
            double[] SO2 = new double[8] { 0, 50, 150, 475, 800, 1600, 2100, 2620 };
            double[] NO2 = new double[8] { 0, 40, 80, 180, 280, 565, 750, 940 };
            double[] PM10 = new double[8] { 0, 50, 150, 250, 350, 420, 500, 600 };
            double[] CO = new double[8] { 0, 2, 4, 14, 24, 36, 48, 60 };
            double[] O3_1 = new double[8] { 0, 160, 200, 300, 400, 800, 1000, 1200 };
            double[] PM25 = new double[8] { 0, 35, 75, 115, 150, 250, 350, 500 };
            int index = 0;

            if (datatype == "PM25")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (PM25[i] <= C && PM25[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (PM25[index] - PM25[index - 1])) * (C - PM25[index - 1]) + IAQI[index - 1];
            }
            else if (datatype == "PM10")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (PM10[i] <= C && PM10[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (PM10[index] - PM10[index - 1])) * (C - PM10[index - 1]) + IAQI[index - 1];
            }
            else if (datatype == "SO2")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (SO2[i] <= C && SO2[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (SO2[index] - SO2[index - 1])) * (C - SO2[index - 1]) + IAQI[index - 1];
            }
            else if (datatype == "CO")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (CO[i] <= C && CO[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (CO[index] - CO[index - 1])) * (C - CO[index - 1]) + IAQI[index - 1];
            }
            else if (datatype == "NO2")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (NO2[i] <= C && NO2[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (NO2[index] - NO2[index - 1])) * (C - NO2[index - 1]) + IAQI[index - 1];
            }
            else if (datatype == "O3_1")
            {
                for (int i = 0; i < 8; i++)
                {
                    if (O3_1[i] <= C && O3_1[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (O3_1[index] - O3_1[index - 1])) * (C - O3_1[index - 1]) + IAQI[index - 1];
            }
            return I;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="ID"></param>
        /// <param name="C"></param>
        /// <returns></returns>
        public static double GetAQI(int ID, double C)
        {
            double I = 0.0;

            double[] IAQI = new double[8] { 0, 50, 100, 150, 200, 300, 400, 500 };
            double[] SO2 = new double[8] { 0, 50, 150, 475, 800, 1600, 2100, 2620 };
            double[] NO2 = new double[8] { 0, 40, 80, 180, 280, 565, 750, 940 };
            double[] PM10 = new double[8] { 0, 50, 150, 250, 350, 420, 500, 600 };
            double[] CO = new double[8] { 0, 2, 4, 14, 24, 36, 48, 60 };
            double[] O3_1 = new double[8] { 0, 160, 200, 300, 400, 800, 1000, 1200 };
            double[] PM25 = new double[8] { 0, 35, 75, 115, 150, 250, 350, 500 };
            int index = 0;

            if (ID == 0)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (PM25[i] <= C && PM25[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (PM25[index] - PM25[index - 1])) * (C - PM25[index - 1]) + IAQI[index - 1];
            }
            else if (ID == 1)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (PM10[i] <= C && PM10[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (PM10[index] - PM10[index - 1])) * (C - PM10[index - 1]) + IAQI[index - 1];
            }
            else if (ID == 2)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (CO[i] <= C && CO[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (CO[index] - CO[index - 1])) * (C - CO[index - 1]) + IAQI[index - 1];
            }
            else if (ID == 3)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (NO2[i] <= C && NO2[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (NO2[index] - NO2[index - 1])) * (C - NO2[index - 1]) + IAQI[index - 1];
            }
            else if (ID == 4)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (O3_1[i] <= C && O3_1[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (O3_1[index] - O3_1[index - 1])) * (C - O3_1[index - 1]) + IAQI[index - 1];
            }
            else if (ID == 5)
            {
                for (int i = 0; i < 8; i++)
                {
                    if (SO2[i] <= C && SO2[i + 1] > C)
                    {
                        index = i + 1;
                        break;
                    }
                }
                I = ((IAQI[index] - IAQI[index - 1]) / (SO2[index] - SO2[index - 1])) * (C - SO2[index - 1]) + IAQI[index - 1];
            }

            return I;
        }

        /// <summary>
        /// 获取最新的基础数据库表
        /// </summary>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static string GetNewestTableName()
        {
            string year = "";
            string month = "";
            string day = "";
            string hour = "";
            SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
            string Tablename = GetNewestTableName(conn,out year,out month,out day,out hour);
            return Tablename;
        }

        /// <summary>
        /// 获取监测站位置数据，经纬度，json格式
        /// </summary>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static string GetLocation()
        {
            DataTable dt = PriGetSocation();//获得监测站的信息表
            int length = dt.Rows.Count;
            string jsonStr = "{\'items\':[";//拼成json格式字符串
            for (int i = 0; i < length; i++)
            {
                jsonStr += "{\'Name\':\'" + dt.Rows[i][1].ToString() + "\',\'X\':" + dt.Rows[i][2].ToString() + ",\'Y\':" + dt.Rows[i][3].ToString() + "}";
                if (i != length - 1)
                {
                    jsonStr += ",";
                }
            }
            jsonStr += "]}";
            return jsonStr;
        }

        /// <summary>
        /// 获取指定监测站的最新数据，以json格式字符串返回
        /// </summary>
        /// <param name="StationName"></param>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static string GetNewestData(string StationName)
        {
            string NewestData = "";
            DateTime Now = DateTime.Now;
            string Year = Now.Year.ToString();
            string Month = Now.Month.ToString();
            string Day = Now.Day.ToString();
            string Hour = Now.Hour.ToString();
            SqlConnection Conn = new SqlConnection(ConnectStr_AirQuality);
            Conn.Open();
            string TableName = GetNewestTableName(Conn, out Year, out Month, out Day, out Hour);

            string SQL = "select AQI,KQZLZSLB,SYWRW,PM25,PM10,CO,NO2,O3_1,O3_8,SO2 from " + TableName + " where JCD = '" + StationName + "'";
            SqlDataAdapter ada = new SqlDataAdapter(SQL, Conn);
            DataSet NewestDataset = new DataSet();
            ada.Fill(NewestDataset);
            DataTable NewestTable = NewestDataset.Tables[0];
            if (Now.Hour < 10)
            {
                NewestData += "{ \"时间\":\"" + Year + "/" + Month + "/" + Day + "   0" + Hour + ":00\",";
            }
            else
            {
                NewestData += "{ \"时间\":\"" + Year + "/" + Month + "/" + Day + "   " + Hour + ":00\",";
            }
            for (int i = 0; i < NewestTable.Columns.Count; i++)
            {
                switch (NewestTable.Columns[i].ColumnName)
                {
                    case "AQI":
                        {
                            NewestData += "\"AQI\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "KQZLZSLB":
                        {
                            NewestData += "\"空气质量指数类别\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "SYWRW":
                        {
                            NewestData += "\"首要污染物\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "PM25":
                        {
                            NewestData += "\"PM2.5细颗粒物\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "PM10":
                        {
                            NewestData += "\"PM10可吸入颗粒物\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "CO":
                        {
                            NewestData += "\"CO一氧化碳\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "NO2":
                        {
                            NewestData += "\"NO2二氧化氮\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "O3_1":
                        {
                            NewestData += "\"O3臭氧1一小时平均\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "O3_8":
                        {
                            NewestData += "\"O3臭氧8小时平均\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\",";
                            break;
                        }
                    case "SO2":
                        {
                            NewestData += "\"SO2二氧化硫\":" + "\"" + NewestTable.Rows[0][i].ToString() + "\"}";
                            break;
                        }
                    default: break;
                }
            }
            Conn.Close();
            return NewestData;
        }

        /// <summary>
        /// 生成基础数据的HighCharts,DataType的值为AQI，PM25，PM10，CO，NO2，O3_1，SO2
        /// </summary>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static object[] GetBasicData(string DataType, DateTime Time)
        {
            string Dataset = "[";//定义返回的json字符串
            string[] TimeSet = new string[0];
            SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
            conn.Open();

            DataTable StationTable = PriGetSocation("Name");
            string[] Data = new string[StationTable.Rows.Count];
            for (int i = 0; i < Data.Length; i++)
            {
                Data[i] = "{name:'" + StationTable.Rows[i][0].ToString() + "',data:[";
            }

            Boolean FirstTable = false;
            int FirstHour = 0;//记录第一个表的时间
            int LastHour = 0;//记录最后表的时间
            Boolean IfChangeLastHour = false;
            for (int i = 0; i <= 23; i++)//从早上0点开始，遍历当天生成的所有基础数据表
            {
                string tableName = "DT_" + Time.Year.ToString() + "_" + Time.Month.ToString() + "_" + Time.Day.ToString() + "_" + i.ToString();
                if (CheckTableExits(tableName, conn))//判断该表是否存在
                {
                    Array.Resize(ref TimeSet, TimeSet.Length + 1);
                    if (i < 10)
                    {
                        TimeSet[TimeSet.Length - 1] = "0" + i + ":00";
                    }
                    else
                    {
                        TimeSet[TimeSet.Length - 1] = i + ":00";
                    }
                    if (i == 23)
                    {
                        LastHour = 23;
                    }
                    IfChangeLastHour = true;//如果不是最后一个表，则更改改天最后表的时间
                    if (!FirstTable)//把最早的表的时间记录下来
                    {
                        FirstTable = true;
                        FirstHour = i;
                    }
                    string SQL = "Select " + DataType + " from " + tableName;
                    SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                    DataSet ds = new DataSet();
                    ada.Fill(ds);
                    DataTable DT_Value = ds.Tables[0];
                    int length = DT_Value.Rows.Count;
                    for (int j = 0; j < length; j++)//遍历表中的数据，并把数据拼凑成json格式的字符串
                    {
                        string value = DT_Value.Rows[j][0].ToString();
                        if (value == "" || value == null || value == "_")
                        {
                            value = "null";
                        }
                        Data[j] += value + ",";
                    }
                }
                else
                {
                    if (IfChangeLastHour)
                    {
                        LastHour = i;
                        IfChangeLastHour = false;
                    }
                    if (FirstTable && i != 23)//若在最早的表的时间之前，不添加到返回数据中
                    {
                        Array.Resize(ref TimeSet, TimeSet.Length + 1);
                        if (i < 10)
                        {
                            TimeSet[TimeSet.Length - 1] = "0" + i + ":00";
                        }
                        else
                        {
                            TimeSet[TimeSet.Length - 1] = i + ":00";
                        }
                        for (int ii = 0; ii < Data.Length; ii++)//若该表不存在时，则使用null作为数据拼入
                        {
                            Data[ii] += "null,";
                        }
                    }
                }
            }
            if (LastHour > 0 && LastHour < 23)
            {
                for (int i = 0; i < Data.Length; i++)
                {
                    int index = Data[i].Length - 5 * (23 - LastHour);
                    Data[i] = Data[i].Remove(index);
                    // Array.Resize(ref Data[i], Count);
                }
                Array.Resize(ref TimeSet, TimeSet.Length - (23 - LastHour));
            }
            for (int i = 0; i < Data.Length; i++)
            {
                Dataset += Data[i] + "]},";
            }
            Dataset += "]";
            conn.Close();
            object[] ReturnData = new object[] { TimeSet, Dataset };
            return ReturnData;
        }

        /// <summary>
        /// 生成统计数据的Json,DataType的值为AQI，PM25，PM10，CO，NO2，O3_1，SO2
        /// </summary>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static object[] GetStaticResult(string DataType, DateTime FromDay, DateTime ToDay)
        {
            try
            {
                if (FromDay < new DateTime(2015, 4, 8))
                {
                    FromDay = new DateTime(2015, 4, 8);
                }
                string Dataset = "[";//定义返回的json字符串
                DateTime NowTime = DateTime.Now;//获得当前时间
                SqlConnection conn = new SqlConnection(ConnectStr_Statics);
                conn.Open();

                DataTable StationTable = PriGetSocation("Name");
                string[] Data = new string[StationTable.Rows.Count];
                for (int i = 0; i < Data.Length; i++)
                {
                    Data[i] = "{name:'" + StationTable.Rows[i][0].ToString() + "',data:[";
                }
                string[] TimeSet = new string[0];
                DateTime NextDay = FromDay.AddDays(-1);
                for (; NextDay < ToDay; )//从FromDay开始，遍历到ToDay生成的所有统计数据表
                {
                    NextDay = NextDay.AddDays(1);

                    Array.Resize(ref TimeSet, TimeSet.Length + 1);
                    TimeSet[TimeSet.Length - 1] = NextDay.Year.ToString() + "-" + NextDay.Month.ToString() + "-" + NextDay.Day.ToString();
                    string tableName = "DT_" + NextDay.Year.ToString() + "_" + NextDay.Month.ToString() + "_" + NextDay.Day.ToString();
                    if (CheckTableExits(tableName, conn))//判断该表是否存在
                    {
                        string SQL = "Select " + DataType + " from " + tableName;
                        SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                        DataSet ds = new DataSet();
                        ada.Fill(ds);
                        DataTable DT_Value = ds.Tables[0];
                        int length = DT_Value.Rows.Count;
                        for (int j = 0; j < length; j++)//遍历表中的数据，并把数据拼凑成json格式的字符串
                        {
                            string value = DT_Value.Rows[j][0].ToString();
                            if (value == "" || value == null || value == "_")
                            {
                                value = "null";
                            }
                            Data[j] += value + ",";
                        }
                    }
                    else
                    {
                        for (int ii = 0; ii < Data.Length; ii++)//若该表不存在时，则使用null作为数据拼入
                        {
                            Data[ii] += "null,";
                        }
                    }
                }
                for (int i = 0; i < Data.Length; i++)
                {
                    Dataset += Data[i] + "]},";
                }
                Dataset += "]";
                object[] ReturnObj = new object[] { Dataset, TimeSet };
                return ReturnObj;
            }
            catch (Exception err)
            {
                return new object[] { err, "" };
            }
        }

        /// <summary>
        /// 判断指定数据库中的数据表是否存在
        /// </summary>
        /// <param name="DatabaseName"></param>
        /// <param name="DatatableName"></param>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static Boolean CheckTableExits(string DatabaseName, string DatatableName)
        {
            try
            {
                Boolean result = true;
                SqlConnection conn;
                switch (DatabaseName)
                {
                    case "Air_Quality":
                        conn = new SqlConnection(ConnectStr_AirQuality);
                        break;
                    case "Air_Statistics":
                        conn = new SqlConnection(ConnectStr_Statics);
                        break;
                    case "Air_Station":
                        conn = new SqlConnection(ConnectStr_AirStation);
                        break;
                    default:
                        conn = new SqlConnection("");
                        result = false;
                        break;
                }
                if (result)
                {
                    conn.Open();
                    result = CheckTableExits(DatatableName, conn);
                    conn.Close();
                }
                return result;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// 返回指定天存在的表
        /// </summary>
        /// <param name="Year"></param>
        /// <param name="Month"></param>
        /// <param name="Day"></param>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static int[] GetExitsTableOneDay(string Year, string Month, string Day)
        {
            SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
            conn.Open();
            int[] exitsTable = new int[0];
            for (int i = 6; i < 24; i++)
            {
                string TableName = "DT_" + Year + "_" + Month + "_" + Day + "_" + i.ToString();
                if (CheckTableExits(TableName, conn))
                {
                    Array.Resize(ref exitsTable, exitsTable.Length + 1);
                    exitsTable[exitsTable.Length - 1] = i;
                }
            }
            conn.Close();
            return exitsTable;
        }

        /// <summary>
        /// 返回指定监测站的指定数据类型的最新数据
        /// </summary>
        /// <param name="StationId"></param>
        /// <param name="DataType"></param>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static object[] GetStationData(string StationName = "广雅中学", string DataType = "AQI")
        {
            
            string Year = "";
            string Month = "";
            string Day = "";
            string Hour = "";
            string DataJson = "[{name:'" + DataType + "',data:[";
            string[] Timeset = new string[0];
            SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
            conn.Open();
            GetNewestTableName(conn, out Year, out Month, out Day, out Hour);
            string TableName = "DT_" + Year + "_" + Month + "_" + Day + "_";
            int NowHour =int.Parse(Hour);
            Boolean flag = false;
            for (int i = 6; i <= NowHour; i++)
            {
                string tableName = TableName + i.ToString();
                if (CheckTableExits(tableName, conn))
                {
                    flag = true;
                    string SQL = "select AQI from " + tableName + " where JCD = '" + StationName + "'";
                    SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                    DataSet ds = new DataSet();
                    ada.Fill(ds);
                    if (ds != null)
                    {
                        string value = ds.Tables[0].Rows[0][0].ToString();
                        if (value == "" || value == null || value == "_")
                        {
                            value = "null";
                        }
                        DataJson += value + ",";
                    }
                }
                if (flag)
                {
                    Array.Resize(ref Timeset, Timeset.Length + 1);
                    Timeset[Timeset.Length - 1] = i < 10 ? "0" + i.ToString() + ":00" : i.ToString() + ":00";
                }
            }
            DataJson += "]}]";
            conn.Close();
            object[] Result = new object[] { Timeset, DataJson };
            return Result;
        }

        /// <summary>
        /// 获得广州市最新的总体数据
        /// </summary>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static object[] GetNewestWholeData()
        {
            object[] Result;

            string[] AQIValue = new string[3];//AQI三个值，依次为平均值，最小值，最大值
            string[] otherValue = new string[6];//其他值，依次为CO、NO2、O3、PM2_5、PM10、SO2
            string Updatetimestr = "";//最新数据时间
            string NewestTableName = "";
            string firstPlu = "_";//首要污染物

            int[] counts = new int[7];
            double[] sum = new double[7];

            SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
            conn.Open();

            DateTime now = DateTime.Now;
            string[] obj = new string[4];
            string TableName = GetNewestTableName(conn, out obj[0], out obj[1], out obj[2], out obj[3]);
            string SQL = "select AQI,CO,NO2,O3_1,PM25,PM10,SO2,SYWRW from " + TableName;
            SqlDataAdapter Adapter = new SqlDataAdapter(SQL, conn);
            DataSet dataset = new DataSet();
            Adapter.Fill(dataset);
            if (dataset != null)
            {
                double max = 0, min = 0;
                DataTable dt = dataset.Tables[0];
                for (int i = 0; i < dt.Rows.Count; i++)
                {
                    #region --获取AQI的max,min--

                    string aqistr = dt.Rows[i][0].ToString();
                    if (aqistr != null && aqistr != "_" && aqistr.Trim() != "")
                    {
                        double AQI = double.Parse(aqistr);

                        counts[0]++;//顺便计算AQI的平均值
                        sum[0] += AQI;

                        if (i == 0)//第一次循环时赋值给max，min，之后的循环再判断其大小赋值
                        {
                            max = AQI;
                            min = AQI;
                        }
                        else
                        {
                            if (AQI > max)
                            {
                                max = AQI;
                                firstPlu = dt.Rows[i][7].ToString();
                            }
                            if (AQI < min)
                            {
                                min = AQI;
                            }
                        }
                    }

                    #endregion --获取AQI的max,min--

                    #region --计算平均值--

                    for (int j = 1; j < dt.Columns.Count - 1; j++)
                    {
                        string valuestr = dt.Rows[i][j].ToString();
                        if (valuestr != null && valuestr != "_" && valuestr.Trim() != "")
                        {
                            double value = double.Parse(valuestr);
                            counts[j]++;
                            sum[j] += value;
                        }
                    }

                    #endregion --计算平均值--
                }
                //计算平均值最后步骤
                AQIValue[0] = counts[0] > 0 ? (sum[0] / counts[0]).ToString("0") : "0";
                AQIValue[1] = min.ToString();
                AQIValue[2] = max.ToString();
                for (int i = 1; i < 7; i++)
                {
                    otherValue[i - 1] = counts[i] > 0 ? (sum[i] / counts[i]).ToString("0") : "0";
                }
                //生成更新数据时间以及首要污染物
                string[] timesplit = TableName.Split('_');
                Updatetimestr = timesplit[1] + "年" + timesplit[2] + "月" + timesplit[3] + "日";
                NewestTableName = "DT_" + timesplit[1] + "_" + timesplit[2] + "_" + timesplit[3] + "_" + timesplit[4];
                int hour = int.Parse(timesplit[4]);
                Updatetimestr += hour < 10 ? "0" + timesplit[4] + ":00" : timesplit[4] + ":00";
            }
            conn.Close();
            Result = new object[] { AQIValue, otherValue, Updatetimestr, firstPlu, NewestTableName };
            return Result;
        }

        [System.Web.Services.WebMethod]
        public static object[] GetPredictionResult(string DataType, DateTime FromDay, DateTime ToDay, string locationId, string days)
        {
            try
            {
                if (FromDay < new DateTime(2015, 4, 8))
                {
                    FromDay = new DateTime(2015, 4, 8);
                }
                string[] Data = new string[2];

                Data[0] = "{name:'" + DataType + "对应浓度的AQI监测值',data:[";
                Data[1] = "{name:'" + DataType + "对应浓度的AQI预测值',data:[";

                double[] sourceData_X = new double[0];
                double[] sourceData_Y = new double[0];

                string[] TimeSet = new string[0];
                DateTime NextDay = FromDay.AddDays(-1);
                SqlConnection conn = new SqlConnection(ConnectStr_Statics);
                conn.Open();
                //获取统计值
                for (; NextDay < ToDay; )
                {
                    NextDay = NextDay.AddDays(1);

                    Array.Resize(ref TimeSet, TimeSet.Length + 1);
                    TimeSet[TimeSet.Length - 1] = NextDay.Year.ToString() + "-" + NextDay.Month.ToString() + "-" + NextDay.Day.ToString();
                    Array.Resize(ref sourceData_X, sourceData_X.Length + 1);
                    Array.Resize(ref sourceData_Y, sourceData_Y.Length + 1);

                    string tableName = "DT_" + NextDay.Year.ToString() + "_" + NextDay.Month.ToString() + "_" + NextDay.Day.ToString();
                    if (CheckTableExits(tableName, conn))//判断该表是否存在
                    {
                        string SQL = "Select " + DataType + " from " + tableName + " Where ID = " + locationId;
                        SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                        DataSet ds = new DataSet();
                        ada.Fill(ds);
                        DataTable DT_Value = ds.Tables[0];
                        string value = DT_Value.Rows[0][0].ToString();
                        if (value == "" || value == null || value == "_")
                        {
                            value = "null";
                            sourceData_X[sourceData_X.Length - 1] = 0;
                            sourceData_Y[sourceData_Y.Length - 1] = 0;
                            Data[0] += "null,";
                        }
                        else
                        {
                            sourceData_X[sourceData_X.Length - 1] = Convert.ToDouble(value);
                            sourceData_Y[sourceData_Y.Length - 1] = GetAQI(DataType, Convert.ToDouble(value));
                            Data[0] += sourceData_Y[sourceData_Y.Length - 1] + ",";
                        }

                    }
                    else
                    {
                        //若该表不存在时，则使用null作为数据拼入
                        Data[0] += "null,";
                        sourceData_X[sourceData_X.Length - 1] = 0;
                        sourceData_Y[sourceData_Y.Length - 1] = 0;
                    }
                }
                Data[0] += "]},";

                //获取预测值
                Prediction pPrediction = new Prediction(sourceData_X, sourceData_Y);
                double[] result = pPrediction.GetPredictData(Convert.ToInt32(days));
                int j;
                for (j = 0; j < result.Length; j++)
                {
                    Data[1] += result[j].ToString() + ",";
                    //新增预测的日期
                    if (j >= result.Length - Convert.ToInt32(days))
                    {
                        NextDay = NextDay.AddDays(1);
                        Array.Resize(ref TimeSet, TimeSet.Length + 1);
                        TimeSet[TimeSet.Length - 1] = NextDay.Year.ToString() + "-" + NextDay.Month.ToString() + "-" + NextDay.Day.ToString();
                    }
                }
                Data[1] += "]}";

                string Dataset = "[" + Data[0] + Data[1] + "]";
                object[] ReturnObj = new object[] { Dataset, TimeSet };
                return ReturnObj;
            }
            catch (Exception err)
            {
                return new object[] { err, "" };
            }
        }

        public static double[] Prediction(string DataType, DateTime FromDay, DateTime ToDay, string locationId, string hour)
        {
            try
            {
                if (FromDay < new DateTime(2015, 4, 8))
                {
                    FromDay = new DateTime(2015, 4, 8);
                }

                double[] sourceData_X = new double[0];
                double[] sourceData_Y = new double[0];

                string[] TimeSet = new string[0];
                SqlConnection conn = new SqlConnection(ConnectStr_AirQuality);
                conn.Open();
                //获取统计值
                for (; FromDay < ToDay; FromDay = FromDay.AddDays(1))
                {
                    Array.Resize(ref TimeSet, TimeSet.Length + 1);
                    TimeSet[TimeSet.Length - 1] = FromDay.Year.ToString() + "-" + FromDay.Month.ToString() + "-" + FromDay.Day.ToString();
                    Array.Resize(ref sourceData_X, sourceData_X.Length + 1);
                    Array.Resize(ref sourceData_Y, sourceData_Y.Length + 1);

                    string tableName = "DT_" + FromDay.Year.ToString() + "_" + FromDay.Month.ToString() + "_" + FromDay.Day.ToString() + "_" + hour.ToString();
                    if (CheckTableExits(tableName, conn))//判断该表是否存在
                    {
                        string SQL = "Select " + DataType + " from " + tableName + " Where ID = " + locationId;
                        SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                        DataSet ds = new DataSet();
                        ada.Fill(ds);
                        DataTable DT_Value = ds.Tables[0];
                        string value = DT_Value.Rows[0][0].ToString();
                        if (value == "" || value == null || value == "_")
                        {
                            value = "null";
                            sourceData_X[sourceData_X.Length - 1] = 0;
                            sourceData_Y[sourceData_Y.Length - 1] = 0;
                        }
                        else
                        {
                            sourceData_X[sourceData_X.Length - 1] = Convert.ToDouble(value);
                            sourceData_Y[sourceData_Y.Length - 1] = GetAQI(DataType, Convert.ToDouble(value));
                        }
                    }
                    else
                    {
                        //若该表不存在时，则使用null作为数据拼入
                        sourceData_X[sourceData_X.Length - 1] = 0;
                        sourceData_Y[sourceData_Y.Length - 1] = 0;
                    }
                }
                //获取预测值
                Prediction pPrediction = new Prediction(sourceData_X, sourceData_Y);
                double[] result = pPrediction.GetPredictData(Convert.ToInt32(1));
                return result;
            }
            catch
            {
                return new double[0];
            }
        }

        [System.Web.Services.WebMethod]
        public static double[] NextTimePrediction(string DataType, DateTime Day, string hour)
        {
            DateTime FromDay = Day.AddDays(-30);
            double[] result = new double[12];
            for (int i = 1; i <= 12; i++)
            {
                double[] prediction = Prediction(DataType, FromDay, Day, i.ToString(), hour);
                result[i - 1] = prediction[prediction.Length - 1];
            }
            return result;
        }

        /// <summary>
        /// 统计首要污染物
        /// </summary>
        /// <param name="Day"></param>
        /// <returns></returns>
        [System.Web.Services.WebMethod]
        public static object[] GetSYWRW(DateTime Day)
        {
            try
            {
                if (Day < new DateTime(2015, 4, 8))
                {
                    Day = new DateTime(2015, 4, 8);
                }
                string Dataset = "[";//定义返回的json字符串
                DateTime NowTime = DateTime.Now;//获得当前时间
                SqlConnection conn = new SqlConnection(ConnectStr_Statics);
                conn.Open();
                DataTable StationTable = PriGetSocation("Name");
                string[] Data = new string[StationTable.Rows.Count];

                string tableName = "DT_" + Day.Year.ToString() + "_" + Day.Month.ToString() + "_" + Day.Day.ToString();
                if (CheckTableExits(tableName, conn))//判断该表是否存在
                {
                    string SQL = "Select AQI, PM25,PM10,CO,NO2,O3_1,SO2 from " + tableName;
                    SqlDataAdapter ada = new SqlDataAdapter(SQL, conn);
                    DataSet ds = new DataSet();
                    ada.Fill(ds);
                    DataTable DT_Value = ds.Tables[0];
                    double sumAQI = 0.0;
                    int countAQI = 0;
                    //按照站点循环添加json
                    for (int i = 0; i < Data.Length; i++)
                    {
                        if (DT_Value != null)
                        {
                            //计算全市平均的AQI
                            if (Convert.ToDouble(DT_Value.Rows[i][0]) != 0)
                            {
                                sumAQI += Convert.ToDouble(DT_Value.Rows[i][0]);
                                countAQI += 1;
                            }

                            Data[i] = "{name:'" + StationTable.Rows[i][0].ToString() + "',pointPlacement: 'on',data:[";

                            string datavalue = "";
                            //查询并计算各污染物对应的AQI贡献值
                            for (int j = 0; j < 6; j++)
                            {
                                double aqi = GetAQI(j, Convert.ToDouble(DT_Value.Rows[i][j + 1]));
                                string value = aqi.ToString() + ",";
                                if (value == "" || value == null || value == "_")
                                {
                                    value = "null,";
                                }
                                datavalue += value;

                            }
                            Data[i] += datavalue + "]},";

                        }
                        else
                        {
                            string valueNULL = "";
                            for (int j = 0; j < 6; j++)//遍历表中的数据，并把数据拼凑成json格式的字符串
                            {
                                valueNULL += "null,";
                            }
                            Data[i] += valueNULL + "]},";

                        }
                    }

                    for (int i = 0; i < Data.Length; i++)
                    {
                        Dataset += Data[i];
                    }
                    Dataset += "]";


                    object[] ReturnObj = new object[] { Dataset, (sumAQI / countAQI).ToString("0") };
                    return ReturnObj;
                }
                else
                {
                    return null;
                }


            }
            catch (Exception err)
            {
                return new object[] { err, "" };
            }
        }

        [System.Web.Services.WebMethod]
        public static double[] Statistics(double[] data)
        {
            if (data == null || data.Length == 0)
                return null;
            else
            {
                double[] statistics = new double[5];
                double minimum = 100000.0;
                double maximum = 0.0;
                double sum = 0.0;
                double mean = 0.0;
                double variance = 0.0;
                double temp = 0.0;
                int count = 0;

                for (int i = 0; i < data.Length; i++)
                {
                    if (data[i] != 0)
                    {
                        minimum = Math.Min(minimum, data[i]);
                        maximum = Math.Max(maximum, data[i]);
                        sum += data[i];
                        count++;
                    }
                }

                mean = sum / count;

                for (int i = 0; i < count; i++)
                {
                    temp += Math.Pow((data[i] - mean), 2);
                }
                variance = temp / count;

                statistics[0] = Math.Round(minimum, 2);
                statistics[1] = Math.Round(maximum, 2);
                statistics[2] = Math.Round(mean, 2);
                statistics[3] = Math.Round(variance, 2);
                statistics[4] = Math.Round(Math.Sqrt(variance), 2);

                return statistics;
            }
        }

        [System.Web.Services.WebMethod]
        public static string[] GetChatMessage()
        {
            DateTime now = DateTime.Now;
            DateTime fromDate = now.AddDays(-5);
            SqlConnection conn = new SqlConnection(ConnectStr_AirStation);
            string SQL = "select Message from ChatMessages where UpdateTime > '" + fromDate.ToShortDateString() + " " + fromDate.ToShortTimeString() + "' and UpdateTime < '" + now.ToShortDateString() + " " + now.ToShortTimeString() + "'";
            SqlDataAdapter adapter = new SqlDataAdapter(SQL, conn);
            DataTable ds = new DataTable();
            adapter.Fill(ds);
            string[] result = new string[ds.Rows.Count];
            for (int i = 0; i < ds.Rows.Count; i++)
            {
                result[i] = ds.Rows[i][0].ToString();
            }
            return result;
        }
    }
}