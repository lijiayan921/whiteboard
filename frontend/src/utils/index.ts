import { Gradient, Pattern } from 'fabric/fabric-impl'
import { fabric } from 'fabric'
import { toolTypes } from './data'
import { BaseBoardProp } from '@/type'

export class BaseBoard {
  canvas!: fabric.Canvas
  type: string
  stateArr: string[]
  stateIdx: number
  strokeColor: string
  lineSize: number
  selectTool: string
  mouseFrom: { x: number; y: number }
  isDrawing: boolean
  mouseTo: { x: number; y: number }
  ws: React.MutableRefObject<WebSocket | null>
  curDrawObjectId: number
  fillColor: string | Pattern | Gradient | undefined
  canvasObject!: fabric.Rect | fabric.Line
  fontSize: number
  isRedoing: boolean
  drawingObject: fabric.Object | null
  textObject: any
  selectedObj: fabric.Object[] | null
  curObj: {}
  id: number | undefined
  //...类型注释
  constructor(props: BaseBoardProp) {
    this.type = props.type
    this.ws = props.ws
    this.selectedObj = null
    this.stateArr = [] // 保存画布的操作记录
    this.stateIdx = 0 // 当前操作步数
    this.strokeColor = 'black'
    this.lineSize = 4
    this.selectTool = props.curTools
    this.isDrawing = false
    this.drawingObject = null
    this.curDrawObjectId = 0
    this.fontSize = 20
    this.fillColor = 'transparent'
    this.textObject = null // 保存用户创建的文本对象
    this.isRedoing = false // 当前是否在执行撤销或重做操作
    this.curObj = {}
    this.mouseFrom = {
      x: 0,
      y: 0,
    }
    this.mouseTo = {
      x: 0,
      y: 0,
    }
    this.initCanvas()
    this.initCanvasEvent()
  }
  initCanvas() {
    if (!this.canvas) {
      this.canvas = new fabric.Canvas(this.type, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
      this.canvas.selection = false
      this.canvas.hoverCursor = 'default'
      this.canvas.renderAll()
      this.stateIdx = 0
    }
  }
  initCanvasEvent() {
    this.canvas.on('mouse:down', (options) => {
      if (this.selectedObj) {
        this.isDrawing = false
        return
      }
      if (this.selectTool != 'text' && this.textObject) {
        // 如果当前存在文本对象，并且不是进行添加文字操作 则 退出编辑模式
        this.textObject.exitEditing()
        if (this.textObject.text == '') {
          this.canvas.remove(this.textObject)
        }
        this.canvas.renderAll()
        this.textObject = null
      }
      // 判断当前是否选择了集合中的操作
      if (toolTypes.indexOf(this.selectTool) != -1) {
        // 记录当前鼠标的起点坐标
        this.mouseFrom.x = options.e.clientX
        this.mouseFrom.y = options.e.clientY
        if (this.selectTool == 'text') {
          this.initText()
        } else {
          // 设置当前正在进行绘图 或 移动操作
          this.isDrawing = true
        }
      }
    })
    // 监听鼠标移动事件
    this.canvas.on('mouse:move', (options) => {
      // 如果当前正在进行绘图或移动相关操作
      if (this.isDrawing) {
        // 记录当前鼠标移动终点坐标
        this.mouseTo.x = options.e.clientX
        this.mouseTo.y = options.e.clientY
        switch (this.selectTool) {
          case 'line':
            // 当前绘制直线，初始化直线绘制
            this.initLine()
            break
          case 'rect':
            this.initRect()
            break
          case 'circle':
            this.initCircle()
            break
          case 'ellipse':
            this.initEllipse()
            break
          case 'triangle':
            this.initTriangle()
            break
          case 'rhombus':
            this.initRhombus()
        }
      }
    })
    // 监听鼠标松开事件
    let recordTimer: any
    // 鼠标抬起是发送消息
    this.canvas.on('mouse:up', (e) => {
      // 清空鼠标移动时保存的临时绘图对象
      this.drawingObject = null

      if (this.type === 'create' || this.type === 'join') {
        this.id = 0
      } else {
        this.id = parseInt(this.type)
      }

      let obj = { pageId: this.id, seqData: JSON.stringify(this.canvas.toJSON()) }
      let sendObj = JSON.stringify(obj)
      this.ws.current?.send(sendObj)
      if (this.isDrawing) {
        this.isDrawing = false
      }
      // 当前不是进行撤销或重做操作
      if (!this.isRedoing) {
        if (recordTimer) {
          clearTimeout(recordTimer)
          recordTimer = null
        }
        recordTimer = setTimeout(() => {
          this.stateArr.push(JSON.stringify(this.canvas))
          this.stateIdx++
        }, 100)
      } else {
        this.isRedoing = false
      }
    })
  }
  initBrush() {
    // 设置绘画模式画笔类型为 铅笔类型
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas)
    // 设置画布模式为绘画模式
    this.canvas.isDrawingMode = true
    // 设置绘画模式 画笔颜色与画笔线条大小
    this.canvas.freeDrawingBrush.color = this.strokeColor
    this.canvas.freeDrawingBrush.width = this.lineSize
  }
  initText() {
    if (!this.textObject) {
      // 当前不存在绘制中的文本对象
      // 创建文本对象

      this.textObject = new fabric.Textbox('', {
        left: this.mouseFrom.x,
        top: this.mouseFrom.y,
        fontSize: this.fontSize,
        fill: this.strokeColor,
        hasControls: false,
        editable: true,
        width: 30,
        backgroundColor: 'transparent',
        selectable: true,
        padding: 10,
        angle: 0,
        opacity: 1,
      })
      this.canvas.add(this.textObject)
      // 文本打开编辑模式
      this.textObject.enterEditing()
      // 文本编辑框获取焦点
      this.textObject.hiddenTextarea.focus()
    } else {
      // 将当前文本对象退出编辑模式
      this.textObject.exitEditing()
      this.textObject.set('backgroundColor', 'rgba(0,0,0,0)')
      if (this.textObject.text == '') {
        this.canvas.remove(this.textObject)
      }
      this.canvas.renderAll()
      this.textObject = null
      return
    }
  }
  initLine() {
    // 根据保存的鼠标起始点坐标 创建直线对象
    this.canvasObject = new fabric.Line([this.mouseFrom.x, this.mouseFrom.y, this.mouseTo.x, this.mouseTo.y], {
      fill: this.fillColor,
      stroke: this.strokeColor,
      strokeWidth: this.lineSize,
      selectable: true,
      angle: 0,
      opacity: 1,
    })
    // 绘制 图形对象
    this.drawingGraph(this.canvasObject)
  }
  initRect() {
    // 计算矩形长宽
    let left = this.mouseFrom.x
    let top = this.mouseFrom.y
    let width = this.mouseTo.x - this.mouseFrom.x
    let height = this.mouseTo.y - this.mouseFrom.y
    // 创建矩形 对象
    this.canvasObject = new fabric.Rect({
      left: left,
      top: top,
      width: width,
      height: height,
      stroke: this.strokeColor,
      fill: this.fillColor,
      strokeWidth: this.lineSize,
      selectable: true,
      angle: 0,
      opacity: 1,
    })

    // 绘制矩形
    this.drawingGraph(this.canvasObject)
  }
  initCircle() {
    let left = this.mouseFrom.x
    let top = this.mouseFrom.y
    // 计算圆形半径
    let radius = Math.sqrt(Math.pow(this.mouseTo.x - left, 2) + Math.pow(this.mouseTo.y - top, 2)) / 2
    // 创建 原型对象
    let canvasObject = new fabric.Circle({
      left: left,
      top: top,
      stroke: this.strokeColor,
      fill: this.fillColor,
      radius: radius,
      strokeWidth: this.lineSize,
      selectable: true,
      angle: 0,
      opacity: 1,
    })

    // 绘制圆形对象
    this.drawingGraph(canvasObject)
  }
  initEllipse() {
    let left = this.mouseFrom.x
    let top = this.mouseFrom.y
    let canvasObject = new fabric.Ellipse({
      left: left,
      top: top,
      stroke: this.strokeColor,
      fill: this.fillColor,
      rx: Math.abs(left - this.mouseTo.x) / 2,
      ry: Math.abs(top - this.mouseTo.y) / 2,
      strokeWidth: this.lineSize,
      selectable: true,
      angle: 0,
      opacity: 1,
    })
    // 绘制圆形对象
    this.drawingGraph(canvasObject)
  }
  initTriangle() {
    let left = this.mouseFrom.x
    let top = this.mouseFrom.y
    let width = this.mouseTo.x - this.mouseFrom.x
    let height = this.mouseTo.y - this.mouseFrom.y
    let canvasObject = new fabric.Triangle({
      left: left,
      top: top,
      stroke: this.strokeColor,
      fill: this.fillColor,
      width: width,
      height: height,
      strokeWidth: this.lineSize,
      selectable: true,
      angle: 0,
      opacity: 1,
    })
    this.drawingGraph(canvasObject)
  }
  initRhombus() {
    // 计算矩形长宽
    let left = this.mouseFrom.x
    let top = this.mouseFrom.y
    let height = this.mouseTo.y - this.mouseFrom.y
    this.canvasObject = new fabric.Rect({
      left: left,
      top: top,
      width: height,
      height: height,
      stroke: this.strokeColor,
      fill: this.fillColor,
      strokeWidth: this.lineSize,
      angle: 45,
      selectable: true,
      opacity: 1,
    })
    this.drawingGraph(this.canvasObject)
  }
  drawingGraph(canvasObject: any) {
    canvasObject.selectable = true
    // 如果当前图形已绘制，清除上一次绘制的图形
    if (this.drawingObject) {
      this.canvas.remove(this.drawingObject)
    }
    this.canvas.add(canvasObject)
    this.drawingObject = canvasObject
  }
  deleteSelectObj() {
    this.selectedObj &&
      this.selectedObj.map((item) => {
        this.canvas.remove(item)
        let obj = { pageId: this.id, seqData: JSON.stringify(this.canvas.toJSON()) }
        let sendObj = JSON.stringify(obj)
        this.ws.current?.send(sendObj)
      })
  }
  clearCanvas() {
    let children = this.canvas.getObjects()
    if (children.length > 0) {
      this.canvas.remove(...children)
    }
    let obj = { pageId: this.id, seqData: JSON.stringify(this.canvas.toJSON()) }
    let sendObj = JSON.stringify(obj)
    this.ws.current?.send(sendObj)
  }
}
