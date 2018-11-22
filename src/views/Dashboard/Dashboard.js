import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
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
} from 'reactstrap';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities'
import ReactEcharts from 'echarts-for-react';
import echarts from 'echarts/lib/echarts';
import openSocket from 'socket.io-client';
require('es6-promise').polyfill();
require('isomorphic-fetch');
const socket = openSocket('http://10.3.132.180:3000');

const Loading = () => <div>Loading...</div>

var data = [];
var now = +new Date(1997, 9, 3);
var oneDay = 24 * 3600 * 1000;
var value = Math.random() * 1000;
for (var i = 0; i < 1000; i++) {
  data.push(randomData());
}


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
    };
  }

  fetchData () {
    fetch('http://10.3.132.180:3000/nx?interval=' + this.state.nxInterval.toString())
    .then(function(response) {
        if (response.status >= 400) {
            throw new Error("Bad response from server");
        }
        return response.json();
    })
    .then(() => {
      fetch('http://10.3.132.180:3000/normal?interval='+this.state.healthInterval)
      .then(function(response) {
          if (response.status >= 400) {
              throw new Error("Bad response from server");
          }
          return response.json();
      })
      .then(normal => {
        this.setState({normal: normal});
      });
    })
    .then(() => {
      fetch('http://10.3.132.180:3000/error?interval='+this.state.healthInterval)
      .then(function(response) {
          if (response.status >= 400) {
              throw new Error("Bad response from server");
          }
          return response.json();
      })
      .then(error => {
        this.setState({error: error});
      });
    })
    .then(() => {
      fetch('http://10.3.132.180:3000/type?type='+this.state.typeSelected)
      .then((response) => {
        if (response.status >= 400) {
          throw new Error("Bad response from server");
        }
        return response.json();
      })
      .then((type) => {
        this.setState({topType: type});
      });
    });

    subscribeToTimer();
  }

  componentWillMount() {
    console.log('willMount')
    clearInterval(this.interval);
  }

  componentDidMount() {
    let echarts_instance = this.echarts_react.getEchartsInstance();
    console.log('didMount')
    this.fetchData();
    setInterval(() => {
      console.log('myInterval')
      for (var i = 0; i < 5; i++) {
        data.shift();
        data.push(randomData());
      }
      console.log(data)

      echarts_instance.setOption({
        series: [{
            data: data
        }]
      });
    }, 1000);
  }

  onRadioBtnClick(radioSelected) {
    var interval = '1h';
    if (radioSelected == 1) {
      interval = '5m';
    } else if (radioSelected == 2) {
      interval = '1h'
    }
    this.setState({
      nxInterval: interval,
      radioSelected: radioSelected,
    });
    this.fetchData();
  }

  onHealthBtnClick(radioHealth) {
    var interval = '2h';
    if (radioHealth == 1) {
      interval = '1h';
    } else if (radioHealth == 2) {
      interval = '2h'
    }
    this.setState({
      healthInterval: interval,
      radioHealth: radioHealth,
    });
    this.fetchData();
  }

  onTypeClick(type) {
    this.setState({typeSelected: type});
    this.fetchData();
  }

  getOption() {
    const data = [];
    const hours = [
      '00', '01', '02', '03', '04', '05', 
      '06', '07', '08', '09', '10', '11',
      '12', '13', '14', '15', '16', '17',
      '18', '19', '20', '21', '22', '23'];
    const days = ['Saturday', 'Friday', 'Thursday', 
      'Wednesday', 'Tuesday', 'Monday', 'Sunday'];

    try {
      const normal = this.state.normal.map(x => x.doc_count);
      const error = this.state.error.map(x => x.doc_count);
      const timestamp = this.state.normal.map(x => x.key/1000);
      const day = timestamp.map(x => getDayOfWeek(x));
      const hour = timestamp.map(x => getHourOfDay(x));
      const health = calculateHealth(error, normal);

      // [time, day, size]
      const table = new Array(7);
      for (var i=0; i<table.length; i++) {
        table[i] = new Array(24);
        table[i] = table[i].fill(0);
      }

      for (var i=0; i<health.length; i++) {
        table[day[i]][hour[i]] = health[i] + table[day[i]][hour[i]];
      }

      for (var i=0; i<table.length; i++) {
        for (var j=0; j<table[i].length; j++) {
          data.push([j, i, table[i][j]]);
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
              return params.value[2] + ' score ' + hours[params.value[0]] + ' of ' + days[params.value[1]];
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
          type: 'effectScatter',
          symbolSize: function (val) {
              return val[2] * 70;
          },
          data: data,
          animationDelay: function (idx) {
              return idx * 5;
          },
          itemStyle: {
            normal: {
                shadowBlur: 10,
                shadowColor: 'rgba(120, 36, 50, 0.2)',
                shadowOffsetY: 5,
                color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [{
                    offset: 0,
                    color: 'rgb(231, 76, 60)'
                }, {
                    offset: 1,
                    color: 'rgb(231, 76, 60)'
                }])
            }
        },
      }]
    };

    return option;
  }

  getParallel(){
    var option = {
      parallelAxis: [
          {dim: 0, name: 'Client IP'},
          {dim: 1, name: 'DNS Server IP'},
          {dim: 2, name: 'Type'},
          {
              dim: 3,
              name: 'Answer',
              type: 'category',
              data: ['Excellent', 'Good', 'OK', 'Bad']
          }
      ],
      series: {
          type: 'parallel',
          lineStyle: {
              width: 4
          },
          data: [
              [129, 100, 82, 'Good'],
              [9.99, 80, 77, 'OK'],
              [20, 120, 60, 'Excellent']
            ]
          }
        };
    return option;
  }

  getTop() {
    var txtKey = [];
    var txtValue = [];
    var logScale = false;
    try {
      txtKey = this.state.topType.map((x) => x.key);
      var tmp = this.state.topType.map((x) => x.doc_count);

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
          right: '4%',
          bottom: '3%',
          containLabel: true
      },
      xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01]
      },
      yAxis: {
          type: 'category',
          data: txtKey
      },
      series: [
          {
              name: 'Data',
              type: 'bar',
              data: txtValue
          }
      ]
    };
    return option;
  }

  getRealTimeNxNormal() {
    console.log('getRealTime')

    var option = {
      title: {
          text: '动态数据 + 时间坐标轴'
      },
      tooltip: {
          trigger: 'axis',
          formatter: function (params) {
              params = params[0];
              var date = new Date(params.name);
              return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' : ' + params.value[1];
          },
          axisPointer: {
              animation: false
          }
      },
      xAxis: {
          type: 'time',
          splitLine: {
              show: false
          }
      },
      yAxis: {
          type: 'value',
          boundaryGap: [0, '100%'],
          splitLine: {
              show: false
          }
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 10
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
      series: [{
          name: '模拟数据',
          type: 'line',
          showSymbol: false,
          hoverAnimation: false,
          data: []
      }]
    };
    return option
  }

  render() {
    return (
      <div className="animated fadeIn">
        <Row>
          <Col>
            <Card>
              <CardBody>
                <Row>
                  <Col sm="5">
                    <CardTitle className="mb-0">Normal and Nxdomain</CardTitle>
                    <div className="text-muted">3-7 November 2017</div>
                  </Col>
                </Row>
                <div className="chart-wrapper" style={{ height: 300 + 'px', marginTop: 40 + 'px' }}>
                  <ReactEcharts ref={(e) => { this.echarts_react = e; }} option={this.getRealTimeNxNormal()} />
                </div>
              </CardBody>
              <CardFooter>
                <Row className="text-center">
                  <Col sm={12} md className="mb-sm-2 mb-0">
                    <strong>Normal</strong>
                    <Progress className="progress-xs mt-2" color="success" value="50" />
                  </Col>
                  <Col sm={12} md className="mb-sm-2 mb-0 d-md-down-none">
                    <strong>Nxdomain</strong>
                    <Progress className="progress-xs mt-2" color="info" value="50" />
                  </Col>
                </Row>
              </CardFooter>
            </Card>
          </Col>
          <Col>
            <Card>
              <CardBody>
                <Row>
                  <Col sm="5">
                    <CardTitle className="mb-0">Traffic Health</CardTitle>
                    <div className="text-muted">3-7 November 2017</div>
                  </Col>
                  <Col sm="7" className="d-none d-sm-inline-block">
                    <ButtonToolbar className="float-right" aria-label="Toolbar with button groups">
                      <ButtonGroup className="mr-3" aria-label="First group">
                        <Button color="outline-secondary" onClick={() => this.onHealthBtnClick(1)} active={this.state.radioHealth === 1}>1 Hour</Button>
                        <Button color="outline-secondary" onClick={() => this.onHealthBtnClick(2)} active={this.state.radioHealth === 2}>2 Hours</Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                  </Col>
                </Row>
                <div className="chart-wrapper" style={{ height: 366 + 'px', marginTop: 40 + 'px' }}>
                  <ReactEcharts option={this.getOption()} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card>
              <CardBody>
                <Row>
                  <Col sm="5">
                    <CardTitle className="mb-0">Top Query By Type</CardTitle>
                    <div className="text-muted">3-7 November 2017</div>
                  </Col>
                  <Col sm="7" className="d-none d-sm-inline-block">
                    <ButtonToolbar className="float-right" aria-label="Toolbar with button groups">
                      <ButtonGroup className="mr-3" aria-label="First group">
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
                <div className="chart-wrapper" style={{ height: 366 + 'px', marginTop: 40 + 'px' }}>
                  <ReactEcharts option={this.getTop()} />
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </div>
      
    );
  }
}

function getDayOfWeek (timestamp) {
  var date = new Date(timestamp*1000);
  return date.getDay();
}

function getHourOfDay (timestamp) {
  var date = new Date(timestamp*1000);
  return date.getHours();
}

function calculateHealth (error, normal) {
  var result = []
  for (let i=0; i<error.length; i++) {
    result.push(error[i]/normal[i]);
  }
  return result;
}

function randomData() {
  now = new Date(+now + oneDay);
  value = value + Math.random() * 21 - 10;
  return {
      name: now.toString(),
      value: [
          [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/'),
          Math.abs(Math.round(value))
      ]
  }
}

function subscribeToTimer() {
  socket.on('timer', (timestamp) => {
    console.log(timestamp);
  });
  socket.emit('subscribeToTimer', 1000);
}

export default Dashboard;
