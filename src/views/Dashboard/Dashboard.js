import React, { Component } from 'react';
import {
  Button,
  ButtonGroup,
  ButtonToolbar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Col,
  Progress,
  Row,
  Table,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink
} from 'reactstrap';
import ReactEcharts from 'echarts-for-react';
import echarts from 'echarts/lib/echarts';
import openSocket from 'socket.io-client';
require('es6-promise').polyfill();
require('isomorphic-fetch');
const socket = openSocket('http://10.3.132.180:3000');

const Loading = () => <div>Loading...</div>

var normalCount = [];
var nxdomainCount = [];

class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.state = {
      radioSelected: 2,
      nxInterval: '1h',
      normal: null,
      error: null,
      healthInterval: '2h',
      radioHealth: 2,
      topType: null,
      typeSelected: 'TXT',
      realTimeNxNormal: [],
      dga: [],
    };
  }
  
  async fetchData () {
     try {
      let responses = await Promise.all([
        fetch('http://10.3.132.180:3000/normal?interval='+this.state.healthInterval),
        fetch('http://10.3.132.180:3000/error?interval='+this.state.healthInterval),
        fetch('http://10.3.132.180:3000/type?type='+this.state.typeSelected),
        fetch('http://10.3.132.180:3000/dga')
      ]);

      let [normal, error, topType, dga] = await Promise.all(responses.map(res => res.json()))

      this.setState({
        normal,
        error,
        topType,
        dga
      });
      console.log(this.state.dga);
    }
    catch(err) {
      console.log(err);
    };
  }

  componentWillMount() {
    clearInterval(this.interval);
  }

  componentDidMount() {
    let echarts_instance = this.echarts_react.getEchartsInstance();
    this.fetchData();
    subscribeSocket(echarts_instance);
  }

  onHealthBtnClick(radioHealth) {
    var interval = '2h';
    if (radioHealth === 1) {
      interval = '1h';
    } else if (radioHealth === 2) {
      interval = '2h'
    }
    this.setState({
      healthInterval: interval,
      radioHealth: radioHealth,
    });
    this.fetchData();
  }

  async onTypeClick(type) {
    try {
      let responses = await Promise.all([
        fetch('http://10.3.132.180:3000/type?type='+type)
      ]);

      let [topType] = await Promise.all(responses.map(res => res.json()))

      this.setState({
        typeSelected: type, 
        topType: topType});
    }
    catch(err) {
      console.log(err);
    };
  }

  getOption() {
    const data = [];
    const dataTop = [];
    const hours = [
      '00', '01', '02', '03', '04', '05', 
      '06', '07', '08', '09', '10', '11',
      '12', '13', '14', '15', '16', '17',
      '18', '19', '20', '21', '22', '23'];
    const days = ['Saturday', 'Friday', 'Thursday', 
      'Wednesday', 'Tuesday', 'Monday', 'Sunday'];

    try {
      // const normal = this.state.normal.map(x => x.doc_count);
      // const error = this.state.error.map(x => x.doc_count);
      var ts = this.state.error.map(x => x.key).concat(this.state.normal.map(x => x.key));
      let timestamp = [...new Set(ts)];
      console.log('len', timestamp.length)
      timestamp.sort();
      var normalMap = this.state.normal.reduce((o, x) => ({...o, [x.key]: x.doc_count}), {});
      var errorMap = this.state.error.reduce((o, x) => ({...o, [x.key]: x.doc_count}), {});
      const day = timestamp.map(x => getDayOfWeek(x));
      const hour = timestamp.map(x => getHourOfDay(x));

      for (var i=0; i< timestamp.length; i++) {
        var n = 0;
        if (normalMap[timestamp[i]]) {
          n = normalMap[timestamp[i]]
        }
        var e = 0
        if (errorMap[timestamp[i]]) {
          e = errorMap[timestamp[i]]
        }
        if (n==0) {
          data.push([hour[i], day[i], 0])
        } else {
          var val = Math.log(e*100/n)/Math.log(10)/1.849*0.5
          if (val>=0.4) {
            dataTop.push([hour[i], day[i], val])
          } else {
            data.push([hour[i], day[i], val])
          }
        }
      }
    } catch (err) {
      console.log(err.message);
    }
    
    var option = {
      legend: {
          data: ['Health'],
          left: 'right'
      },
      tooltip: {
          position: 'top',
          formatter: function (params) {
              return ' score ' + params.value[2].toFixed(2);
          }
      },
      grid: {
          left: 2,
          bottom: 10,
          right: 10,
          containLabel: true
      },
      xAxis: {
          type: 'category',
          data: hours,
          boundaryGap: false,
          splitLine: {
              show: true,
              lineStyle: {
                  color: '#999',
                  type: 'dashed'
              }
          },
          axisLine: {
              show: false
          }
      },
      yAxis: {
          type: 'category',
          data: days,
          axisLine: {
              show: false
          }
      },
      series: [{
          name: 'Health',
          type: 'scatter',
          symbolSize: function (val) {
              return val[2] * 50;
          },
          data: data,
          animationDelay: function (idx) {
              return idx * 5;
          },
          itemStyle: {
            normal: {
              shadowBlur: 20,
              shadowColor: 'rgba(183,28,28,0.5)',
              shadowOffsetY: 5,
              color: function (value) {
                var weight = 0;
                if (value['data'] != undefined) {
                  weight = value['data'][2];
                }
                return new echarts.graphic.RadialGradient(0.5, 0.5, weight*1.5, [{
                      offset: 0,
                      color: 'rgb(230,28,28)'
                  }, {
                      offset: 1,
                      color: 'rgb(230,28,28)'
                  }
                ]);
              }
            },
          },
        },
        {
          name: 'Health',
          type: 'effectScatter',
          symbolSize: function (val) {
              return val[2] * 50;
          },
          data: dataTop,
          animationDelay: function (idx) {
              return idx * 5;
          },
          itemStyle: {
            normal: {
              shadowBlur: 20,
              shadowColor: 'rgba(183,28,28,0.5)',
              shadowOffsetY: 5,
              color: function (value) {
                var weight = 0;
                if (value['data'] != undefined) {
                  weight = value['data'][2];
                }
                return new echarts.graphic.RadialGradient(0.5, 0.5, weight*1.5, [{
                      offset: 0,
                      color: 'rgb(230,28,28)'
                  }, {
                      offset: 1,
                      color: 'rgb(230,28,28)'
                  }
                ]);
              }
            }
          },
        }
    ]
    };

    return option;
  }

  getTop() {
    var txtKey = [];
    var txtValue = [];
    var logScale = false;
    try {
      txtKey = this.state.topType.map((x) => {
        if (x.key.length > 20) {
          return x.key.slice(0,20).toString() + "..."
        } else {
          return x.key
        }
      }).reverse();
      var tmp = this.state.topType.map((x) => x.doc_count).reverse();

      var minValue = Math.min(...tmp);
      var maxValue = Math.max(...tmp);

      if (maxValue > 50*minValue) {
        txtValue = tmp.map((x) => Math.log(x));
        logScale = true;
      } else {
        txtValue = tmp;
        logScale = false;
      }
    }
     catch (err) {
      console.log(err.message);
    }

    var option = {
      title: {
        text: logScale?'Log Scale':''
      },
      tooltip: {
          trigger: 'axis',
          axisPointer: {
              type: 'shadow'
          }
      },
      grid: {
          left: '3%',
          right: '3%',
          bottom: '0%',
          top: '10%',
          containLabel: true
      },
      xAxis: {
          type: 'value',
          boundaryGap: [0, 0]
      },
      yAxis: {
          type: 'category',
          data: txtKey
      },
      series: [
          {
              name: 'Data',
              type: 'bar',
              data: txtValue,
              color: 'rgb(23, 162, 184)'
          }
      ]
    };
    return option;
  }

  getRealTimeNxNormal() {

    var option = {
      tooltip: {
          trigger: 'axis',
          axisPointer: {
              animation: false
          }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        containLabel: true
      },
      xAxis: {
          type: 'time',
          splitLine: {
              show: false
          }
      },
      yAxis: {
          type: 'value',
          boundaryGap: [0, '30%'],
          splitLine: {
              show: false
          }
      },
      dataZoom: [{
          type: 'inside',
          start: 70,
          end: 100
      },{
          start: 0,
          end: 10,
          handleSize: '80%',
          handleStyle: {
              color: '#fff',
              shadowBlur: 3,
              shadowColor: 'rgba(0, 0, 0, 0.6)',
              shadowOffsetX: 2,
              shadowOffsetY: 2
          }
      }],
      series: [
        {
          name: 'Normal',
          type: 'line',
          showSymbol: false,
          hoverAnimation: false,
          data: [],
          color: 'rgb(77, 189, 116)'
        },
        {
          name: 'NXDOMAIN',
          type: 'line',
          showSymbol: false,
          hoverAnimation: false,
          data: [],
          color: 'rgb(248, 108, 107)'
        }
    ]
    };
    return option
  }

  render() {
    return (
      <div className="animated fadeIn">
        <Row>
          <Col>
            <Card>
              <CardHeader>
                Success and NXDOMAIN
                <div className="text-muted">3-7 November 2017</div>
              </CardHeader>
              <CardBody>
                <div className="chart-wrapper" style={{ height: 300 + 'px', marginTop: 0 + 'px' }}>
                  <ReactEcharts ref={(e) => { this.echarts_react = e; }} option={this.getRealTimeNxNormal()} />
                </div>
              </CardBody>
              <CardFooter>
                <Row className="text-center">
                  <Col sm={12} md className="mb-sm-2 mb-0">
                    <strong>Success</strong>
                    <Progress className="progress-xs mt-2" color="success" value="50" />
                  </Col>
                  <Col sm={12} md className="mb-sm-2 mb-0 d-md-down-none">
                    <strong>NXDOMAIN</strong>
                    <Progress className="progress-xs mt-2" color="danger" value="50" />
                  </Col>
                </Row>
              </CardFooter>
            </Card>
          </Col>
          <Col>
            <Card>
              <CardHeader>
                Traffic Health
                <div className="text-muted">3-7 November 2017</div>
              </CardHeader>
              <CardBody>
                <div className="chart-wrapper" style={{ height: 366 + 'px', marginTop: 0 + 'px' }}>
                  <ReactEcharts option={this.getOption()} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card>
              <CardHeader>
              Top Queries by Type
                <div className="text-muted">3-7 November 2017</div>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col sm="12" className="d-none d-sm-inline-block">
                    <ButtonToolbar style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                      <ButtonGroup>
                      <Button color="outline-secondary" onClick={() => this.onTypeClick('A')} active={this.state.typeSelected === 'A'}>A</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('AAAA')} active={this.state.typeSelected === 'AAAA'}>AAAA</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('TXT')} active={this.state.typeSelected === 'TXT'}>TXT</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('NS')} active={this.state.typeSelected === 'NS'}>NS</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('CNAME')} active={this.state.typeSelected === 'CNAME'}>CNAME</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('PTR')} active={this.state.typeSelected === 'PTR'}>PTR</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('MX')} active={this.state.typeSelected === 'MX'}>MX</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('RRSIG')} active={this.state.typeSelected === 'RRSIG'}>RRSIG</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('DNSKEY')} active={this.state.typeSelected === 'DNSKEY'}>DNSKEY</Button>
                        <Button color="outline-secondary" onClick={() => this.onTypeClick('DS')} active={this.state.typeSelected === 'DS'}>DS</Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                  </Col>
                </Row>
                <div className="chart-wrapper" style={{ height: 366 + 'px', marginTop: 0 + 'px'}}>
                  <ReactEcharts option={this.getTop()} style={{ height: '100%', marginTop: 0 + 'px'}}/>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card>
              <CardHeader>
                DGA
              </CardHeader>
              <CardBody >
                <Table hover responsive striped>
                  <thead>
                    <tr>
                      <th>Date Time</th>
                      <th>Query</th>
                      <th>Answer</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>DGA Score</th>
                      <th>Suspected</th>

                    </tr>
                  </thead>
                  <tbody>
                    {
                      this.state.dga.map((row) => {
                        return  <tr>
                                  <td>{row[5]} {row[6]}</td>
                                  <td>{row[0]}</td>
                                  <td>{row[1]}</td>
                                  <td>{row[2]}</td>
                                  <td>{row[3]}</td>
                                  <td>{row[4]}</td>
                                  <td>{[row[4]].map((item) => {
                                        if (item > 130 ) {
                                          return <Badge color="danger">High</Badge>     
                                        } else if (item > 80) {
                                          return <Badge color="warning">Medium</Badge>
                                        } else {
                                          return <Badge color="success">Low</Badge>
                                        }
                                      })
                                    }</td>
                                </tr>
                      })
                    }
                  </tbody>
                </Table>
              </CardBody>
            </Card>
          </Col>
        </Row>        
      </div>
      
    );
  }
}

function getDayOfWeek (timestamp) {
  var date = new Date(timestamp);
  return 6-date.getDay();
}

function getHourOfDay (timestamp) {
  var date = new Date(timestamp);
  return date.getHours();
}

function calculateHealth (error, normal) {
  var result = []
  for (let i=0; i<error.length; i++) {
    result.push(error[i]/normal[i]);
  }
  return result;
}

function subscribeSocket(echarts_instance) {
  socket.on('prev', (previousData) => {
    if (normalCount.length == 0) {
      normalCount = previousData.map((v) => {
        return {value: [v.timestamp, v.NORMAL]}
      });
      nxdomainCount = previousData.map((v) => {
        return {value: [v.timestamp, v.NXDOMAIN]}
      });
    }
  });
  socket.emit('subscribeToStream', {startTime: 1509694769000, queryInterval: 1000, interval: 1000});
  socket.on('stream', (result) => {
    if (normalCount.length > 1000) {
      for (var i=0; i<5;i++) {
        normalCount.shift();
        normalCount.shift();
      }
    }
    
    var norm = 0;
    if (result.NORMAL != null) {
      norm = result.NORMAL;
    }
    normalCount.push({
      value: [
        result.timestamp,
        norm
      ]
    });

    var nx = 0;
    if (result.NXDOMAIN != null) {
      nx = result.NXDOMAIN;
    }
    nxdomainCount.push({
      value: [
        result.timestamp,
        nx 
      ]
    });

    echarts_instance.setOption({
      series: [
        {
          data: normalCount
        },
        {
          data: nxdomainCount
        }
      ]
    });
  });
}

export default Dashboard;
