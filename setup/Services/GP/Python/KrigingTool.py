# -*- coding: utf-8 -*-
import arcpy
from arcpy import env   
from arcpy.sa import *
import os
import math
import pymssql
from xml.dom.minidom import parse, parseString
import time
import datetime

class MSSQL():
    """docstring for MSSQL"""
    def __init__(self, host,user,pwd,db):
        self.host = host
        self.user = user
        self.pwd = pwd
        self.db = db

    def __ConnectDB(self):
        if not self.db:
            print "No database"

        self.conn = pymssql.connect(host=self.host,user=self.user,password=self.pwd,database=self.db,charset="utf8")

        cursor=self.conn.cursor()
        if not cursor:
            print "Failed to connect database"
        else:
            return cursor
    def ExecuteQuery(self,sql):
        try:
            cursor=self.__ConnectDB()
            if not cursor:
                print "Failed to get cursor"
            else:
                cursor.execute(sql)
                _list=cursor.fetchall()
                cursor.close()
                return _list
        except Exception, e:
            print "Failed to execute"
            raise e

##input parameters
inputFeatureClass = arcpy.GetParameterAsText(0)
copyFeatureClass = "%scratchworkspace%\\CopyFeatures.shp"
database = arcpy.GetParameterAsText(1)
dataTable = arcpy.GetParameterAsText(2)
dataType = arcpy.GetParameterAsText(3)
workspace = arcpy.GetParameterAsText(4)
extent = arcpy.GetParameterAsText(5)
mask = arcpy.GetParameterAsText(6)
outputResult = arcpy.GetParameterAsText(7)

# Set environment
env.overwriteOutput=True
env.workspace= workspace
env.mask = mask
env.extent = extent
try:
    def GetPreDT(dataTable):
        date=time.strptime(dataTable,"DT_%Y_%m_%d_%H")
        today = datetime.datetime(date[0],date[1],date[2])
        preday = today - datetime.timedelta(days =1)
        strday = str(preday.date()).split('-')
        i=0
        while i < 3:
            strday[i] = int(strday[i])
            i = i + 1
        return "DT_"+str(strday[0])+"_"+str(strday[1])+"_"+str(strday[2])
    ##query  value from SQL
    import inspect, os
    this_file = inspect.getfile(inspect.currentframe())
    this_file_path = os.path.abspath(os.path.dirname(this_file))
    dom1 = parse(this_file_path+'\\config.xml')
    config_element = dom1.getElementsByTagName("config")[0]
    server = config_element.getElementsByTagName("server")[0].getAttribute("name")
    user = config_element.getElementsByTagName("user")[0].getAttribute("name")
    pwd = config_element.getElementsByTagName("pwd")[0].getAttribute("name")

    sqlServer2=MSSQL(host=server,user=user,pwd=pwd,db=database)
    sql="select "+ dataType +" from " + dataTable
    list_Value=sqlServer2.ExecuteQuery(sql)
    i=1
    Value=[]    
    while i <= len(list_Value):
        if list_Value[i-1][0] <> '_':
            value=float(list_Value[i-1][0])
            Value.append(value)
        else:
            if dataType <> "O3_8":
                preDT = GetPreDT(dataTable)
                sqlStatistics = MSSQL(host=server,user=user,pwd=pwd,db="Air_Statistics")
                sql_Stat="select "+ dataType +" from " + preDT            
                list_Stat=sqlStatistics.ExecuteQuery(sql_Stat)
                Value.append(float(list_Stat[i-1][0]))
            else:
                Value.append(float(0))
        i=i+1
    
except Exception, e:
    arcpy.AddMessage("Error occured in Query")
    raise e

try:
##  copy a point featureClass
    arcpy.CopyFeatures_management(inputFeatureClass ,copyFeatureClass);
    if arcpy.Exists(copyFeatureClass):
    ##    set value to the newly fields
        rows = arcpy.UpdateCursor(copyFeatureClass)
        if not rows:
            print "no featureClass"
            raise NameError
        else:
            row=rows.next()
            rowCount=len(Value)
            i=0
            while (row and i<rowCount):
                row.setValue("Value",Value[i])
                rows.updateRow(row)
                i=i+1
                row=rows.next()
            del row
            del rows
    else:
        print "No featureClass"
except Exception, e:
    arcpy.AddMessage("Error occured in Copy FeatureClass")
    raise e
    
try:
##    kriging
    if arcpy.Exists(copyFeatureClass):        
        # Create KrigingModelOrdinary Object
        lagSize =  0.004543
        majorRange = 41.59
        partialSill = 133.53
        nugget = 0.57
        kModelOrdinary = KrigingModelOrdinary("SPHERICAL", lagSize, majorRange, partialSill, nugget)

        # Check out the ArcGIS Spatial Analyst extension license
        arcpy.CheckOutExtension("Spatial")

        # Execute Kriging
        outKrigingOrd = Kriging(copyFeatureClass, "Value", kModelOrdinary,0.004543, RadiusFixed(20000, 10))

        # Save the output
        outKrigingOrd.save(outputResult)
    else:
        arcpy.AddMessage("No featureClass")
except Exception, e:
    arcpy.AddMessage("Error occured in Kriging")
    raise e

