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
} from 'reactstrap';
import ReactEcharts from 'echarts-for-react';
import echarts from 'echarts/lib/echarts';
import openSocket from 'socket.io-client';
require('es6-promise').polyfill();
require('isomorphic-fetch');
const socket = openSocket('http://10.3.132.180:3000');

const Loading = () => <div>Loading...</div>

var normal = [];
var nxdomain = [];
var queryInterval = 60000

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
  
  async fetchData () {
     try {
      let responses = await Promise.all([
        fetch('http://10.3.132.180:3000/normal?interval='+this.state.healthInterval),
        fetch('http://10.3.132.180:3000/error?interval='+this.state.healthInterval),
        fetch('http://10.3.132.180:3000/type?type='+this.state.typeSelected)
      ]);

      let [normal, error, topType] = await Promise.all(responses.map(res => res.json()))

      this.setState({
        normal,
        error,
        topType
      });
    }
    catch(err) {
      console.log(err);
    };
  }

  componentWillMount() {
    console.log('willMount')
    clearInterval(this.interval);
  }

  componentDidMount() {
    let echarts_instance = this.echarts_react.getEchartsInstance();
    console.log('didMount')
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

  onTypeClick(type) {
    this.setState({typeSelected: type});
    this.fetchData();
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
      const normal = this.state.normal.map(x => x.doc_count);
      const error = this.state.error.map(x => x.doc_count);
      const timestamp = this.state.normal.map(x => x.key/1000);
      const day = timestamp.map(x => getDayOfWeek(x));
      const hour = timestamp.map(x => getHourOfDay(x));
      const health = calculateHealth(error, normal);

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
          if (table[i][j] > 0.3) {
            dataTop.push([j, i, table[i][j]]);
          } else {
            data.push([j, i, table[i][j]]);
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
              return ' score ' + hours[params.value[0]] + ' of ' + days[params.value[1]];
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
                    color: 'rgb(220, 53, 69)'
                }, {
                    offset: 1,
                    color: 'rgb(220, 53, 69)'
                }])
            }
          },
        },
        {
          name: 'Health',
          type: 'effectScatter',
          symbolSize: function (val) {
              return val[2] * 70;
          },
          data: dataTop,
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
                    color: 'rgb(220, 53, 69)'
                }, {
                    offset: 1,
                    color: 'rgb(220, 53, 69)'
                }])
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
    console.log('getRealTime')

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
              <CardBody>
                <Row>
                  <Col sm="5">
                    <CardTitle className="mb-0">Normal and Nxdomain</CardTitle>
                    <div className="text-muted">3-7 November 2017</div>
                  </Col>
                </Row>
                <div className="chart-wrapper" style={{ height: 300 + 'px', marginTop: 0 + 'px' }}>
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
                    <Progress className="progress-xs mt-2" color="danger" value="50" />
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
                  </Col>
                </Row>
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
                <div className="chart-wrapper" style={{ height: 366 + 'px', marginTop: 0 + 'px'}}>
                  <ReactEcharts option={this.getTop()} style={{ height: '100%', marginTop: 0 + 'px'}}/>
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

function subscribeSocket(echarts_instance) {
  socket.emit('subscribeToStream', {startTime: 1509693769000, queryInterval: 1000, interval: 1000});
  socket.on('stream', (result) => {
    if (normal.length > 1000) {
      for (var i=0; i<5;i++) {
        normal.shift();
        nxdomain.shift();
      }
    }
    
    var norm = 0;
    if (result.NORMAL != null) {
      norm = result.NORMAL;
    }
    normal.push({
      value: [
        result.timestamp,
        norm
      ]
    });

    var nx = 0;
    if (result.NXDOMAIN != null) {
      nx = result.NXDOMAIN;
    }
    nxdomain.push({
      value: [
        result.timestamp,
        nx 
      ]
    });

    echarts_instance.setOption({
      series: [
        {
          data: normal
        },
        {
          data: nxdomain
        }
      ]
    });
  });
}

export default Dashboard;
