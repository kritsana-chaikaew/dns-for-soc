import React, { Component, lazy, Suspense } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Badge,
  Button,
  ButtonDropdown,
  ButtonGroup,
  ButtonToolbar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Col,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Progress,
  Row,
  Table,
} from 'reactstrap';
import { CustomTooltips } from '@coreui/coreui-plugin-chartjs-custom-tooltips';
import { getStyle, hexToRgba } from '@coreui/coreui/dist/js/coreui-utilities'
import ReactEcharts from 'echarts-for-react';
import echarts from 'echarts/lib/echarts';
require('es6-promise').polyfill();
require('isomorphic-fetch');

// import Widget03 from '../../views/Widgets/Widget03'
const Widget03 = lazy(() => import('../../views/Widgets/Widget03'));
const Loading = () => <div>Loading...</div>

const brandPrimary = getStyle('--primary')
const brandSuccess = getStyle('--success')
const brandInfo = getStyle('--info')
const brandWarning = getStyle('--warning')
const brandDanger = getStyle('--danger')


// Main Chart
const mainChartOpts = {
  tooltips: {
    enabled: false,
    custom: CustomTooltips,
    intersect: true,
    mode: 'index',
    position: 'nearest',
    callbacks: {
      labelColor: function(tooltipItem, chart) {
        return { backgroundColor: chart.data.datasets[tooltipItem.datasetIndex].borderColor }
      }
    }
  },
  maintainAspectRatio: false,
  legend: {
    display: false,
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          drawOnChartArea: false,
        },
      }],
    yAxes: [
      {
        ticks: {
          beginAtZero: true,
          maxTicksLimit: 5,
          stepSize: Math.ceil(350000 / 5),
          max: 350000,
        },
      }],
  },
  elements: {
    point: {
      radius: 0,
      hitRadius: 10,
      hoverRadius: 4,
      hoverBorderWidth: 3,
    },
  },
};

class Dashboard extends Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.onRadioBtnClick = this.onRadioBtnClick.bind(this);

    this.state = {
      dropdownOpen: false,
      radioSelected: 2,
      mainChart: null,
      nxInterval: '1h',
      normal: null,
      error: null,
      healthInterval: '2h',
      radioHealth: 2,
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
    .then(Data => {
      this.setState({
        mainChart: {
          labels: Data[0].map(x => {
            var Num = parseFloat(x.key_as_string);
            var date = new Date(Num*1000);
            var hours = date.getHours();
            var minutes = "0" + date.getMinutes();
            var formattedTime = hours + ':' + minutes.substr(-2);
            return formattedTime;
          }),
          datasets: [
            {
              label: 'Normal Domain',
              backgroundColor: hexToRgba(brandInfo, 10),
              borderColor: brandInfo,
              pointHoverBackgroundColor: '#fff',
              borderWidth: 2,
              data: Data[0].map(x => x.doc_count),
            },
            {
              label: 'NxDomain',
              backgroundColor: 'transparent',
              borderColor: brandSuccess,
              pointHoverBackgroundColor: '#fff',
              borderWidth: 2,
              data: Data[1].map(x => x.doc_count),
            },
          ],
        },
      })
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
    });
  }

  componentDidMount() {
    this.fetchData();
  }

  toggle() {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen,
    });
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

      console.log(data)

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
                  <Col sm="7" className="d-none d-sm-inline-block">
                    <ButtonToolbar className="float-right" aria-label="Toolbar with button groups">
                      <ButtonGroup className="mr-3" aria-label="First group">
                        <Button color="outline-secondary" onClick={() => this.onRadioBtnClick(1)} active={this.state.radioSelected === 1}>Minute</Button>
                        <Button color="outline-secondary" onClick={() => this.onRadioBtnClick(2)} active={this.state.radioSelected === 2}>Hour</Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                  </Col>
                </Row>
                <div className="chart-wrapper" style={{ height: 300 + 'px', marginTop: 40 + 'px' }}>
                  <Line data={this.state.mainChart} options={mainChartOpts} height={300} />
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

export default Dashboard;
