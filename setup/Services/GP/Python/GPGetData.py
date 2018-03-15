# -*- coding: utf-8 -*-


from xml.dom.minidom import parse, parseString
import pymssql,arcgisscripting,sys,inspect,os
gp=arcgisscripting.create(10.2)
gp.overwriteoutput=1  #OverWriteOutput:Boolean,为1表示允许覆盖以存在文件#
gp.copyfeatures_management(gp.GetParameterAsText(0) ,gp.GetParameterAsText(4));
rows=gp.UpdateCursor(gp.GetParameterAsText(4))
row=rows.Next()

#读取config获取数据库实例名#
this_file=inspect.getfile(inspect.currentframe())
this_file_path=os.path.abspath(os.path.dirname(this_file))
dom1 = parse(this_file_path+'\\config.xml')
config_element = dom1.getElementsByTagName("config")[0]
server = config_element.getElementsByTagName("server")[0].getAttribute("name")
user = config_element.getElementsByTagName("user")[0].getAttribute("name")
pwd = config_element.getElementsByTagName("pwd")[0].getAttribute("name")

con=pymssql.connect(host=server,user=user,password=pwd,database=gp.GetParameterAsText(1),charset="utf8")##连接数据库##
cur=con.cursor()
cur.execute("select "+gp.GetParameterAsText(3)+" from "+gp.GetParameterAsText(2))
datalist=cur.fetchall()
rowCount=len(datalist)
i=0
while(row and i<rowCount):
    if str(datalist[i][0])!="_":
        row.Value=float(datalist[i][0])
    else:
        row.Value=0
    i=i+1
    rows.UpdateRow(row)
    row=rows.Next()
cur.close()
con.close()
