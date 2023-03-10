(function() {
// exit vr by B/Y button 
AFRAME.registerComponent('exitvr', {
	init:function() {
		this.el.addEventListener('bbuttonup',this.exitvr)
		this.el.addEventListener('ybuttonup',this.exitvr)			
	},
	exitvr:function() {
		AFRAME.scenes[0].exitVR()
	}
})
// set VR mode height
AFRAME.registerComponent('vrheight', {
	schema:{
		height:{type:"number",default:1.5}
	},
	init:function() {
		const scene = this.el.sceneEl
		const camrig = this.el 
		if(!camrig) return 
		scene.addEventListener("enter-vr", ev=>{
			const p = camrig.getAttribute("position")
			camrig.setAttribute("position", {x:p.x,y:0,z:p.z})
		})
		scene.addEventListener("exit-vr", ev=>{
			const p = camrig.getAttribute("position")
			camrig.setAttribute("position", {x:p.x,y:this.data.height,z:p.z})	
		})
	}
})
// oclusTouch mover
AFRAME.registerComponent('padmove', {
	schema:{
		gripud:{type:"boolean",default:false},
		gripfly:{type:"boolean",default:false},
		move:{type:"boolean",default:true},
		turn:{type:"boolean",default:true}
	},
	init:function() {
		const data = this.data
		let lastx = 0
		let grip = 0  
		this.el.addEventListener('thumbstickmoved',stick)
		this.el.addEventListener('trackpaddown',stick)
		
		function stick(ev){
//			console.log(ev)
			const stick = ev.detail
			const pm = document.querySelector("[padmoved]")?.components.padmoved 
			if(!pm) return 
			if(data.turn && Math.abs(stick.x)>Math.abs(stick.y)) {
				if(Math.abs(stick.x)>0.6){
					if(lastx == 0) {
						lastx = 1
						pm.rotate(stick.x)
					}
				} else lastx = 0
			}
			if(data.gripud) {
				if(grip && Math.abs(stick.x)<Math.abs(stick.y)) pm.ud(stick.y)
				else pm.ud(0)
			}
			if(data.move && !(data.gripud && grip)) {
				if(data.turn) pm.move({x:0,y:stick.y})
				else pm.move({x:stick.x,y:stick.y})
			}
			if(data.gripfly) pm.data.fly = grip 
		}
		this.el.addEventListener('gripchanged',(ev)=>{
			grip = ev.detail.pressed
		})
	}
})
// touch movee
AFRAME.registerComponent('padmoved', {
	schema: {
		movev:{default:2},
		dirlock:{default:false},
		fly:{default:false},
		active:{default:true}
	},
	init:function() {
		const rot = this.el.getAttribute("rotation")
	  this.rot = {x:THREE.MathUtils.degToRad(rot.x),y:THREE.MathUtils.degToRad(rot.y),z:THREE.MathUtils.degToRad(rot.z)}
		this.cdir = {x:0,y:0,z:0}
		this.pdir = {x:0,y:0}
	  this.velocity = 0
	  this.mode = 0
	  this.collision = null 
	  this.o3d = this.el.object3D
	  this.camobj = AFRAME.scenes[0].camera.el.object3D
	  this.el.addEventListener('updown',(ev)=>{
		  this.ud(ev.detail.dir)
		})
	},
	setCollision:function(f) {
		this.collision = f 
	},
	rotate:function(dir) {
		if(!this.data.active) return 
		this.rot.y += THREE.MathUtils.degToRad( (dir>0)?-30:30 ) ;
		this.el.object3D.rotation.set(this.rot.x,this.rot.y,this.rot.z)
	},
	move:function(dir) {
		if(!this.data.active) return 
		this.pdir = dir
		const vl = Math.hypot(dir.x,dir.y)
		if(this.velocity==0 && Math.abs(vl)>0) {
			this.calccdir(dir)
		}
		this.velocity = this.data.movev * vl/1000
		this.mode = 0
	},
	calccdir:function(dir) {
		const d = Math.atan2(dir.x,dir.y)
		let dx,dy,dz
		dy=0
		if(this.data.fly) dy = Math.sin(-this.camobj.rotation.x)
		dz = Math.cos(this.camobj.rotation.y+this.rot.y)
		dx = Math.sin(this.camobj.rotation.y+this.rot.y)
		this.cdir.y = Math.sign(dir.y)*dy
		this.cdir.x = Math.cos(d)*dx+Math.sin(d)*dz
		this.cdir.z =-Math.sin(d)*dx+Math.cos(d)*dz
	},
	ud:function(dir) {
		if(!this.data.active) return 
		this.velocity = this.data.movev * -dir/1000
		this.mode = 1 
	},
	tick:function(time, timeDelta) {
		if(!this.data.active) return 
		const vv = this.velocity *timeDelta
		if(!this.data.dirlock) {
			this.calccdir(this.pdir)
		}
		const dx = this.mode==0?(this.cdir.x * vv):0
		const dz = this.mode==0?(this.cdir.z * vv):0
		const dy = this.mode==1?(vv*0.5):this.cdir.y * vv
		let t = true 
		if(this.collision) t = this.collision({x:this.o3d.position.x+dx,y:this.o3d.position.y+dy,z:this.o3d.position.z+dz})
		if(t) this.o3d.position.add({x:dx,y:dy,z:dz})		
	}
})// matrix transform
AFRAME.registerComponent('matrix4', {
	schema:{
		mat:{default:[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,0]}
	},
	init:function() {
		this.mat = new THREE.Matrix4()
	},
	update:function() {
		this.mat.set(...this.data.mat)
		this.el.object3D.applyMatrix4(this.mat)
	}
})
AFRAME.registerComponent('euler', {
  schema: {
	  angle:{type: 'vec3'},
	  order:{default: 'YXZ'}
	},
  update: function () {
    var data = this.data
    var object3D = this.el.object3D
    object3D.rotation.set(degToRad(data.angle.x), degToRad(data.angle.y), degToRad(data.angle.z))
    object3D.rotation.order = data.order
  },

  remove: function () {
    // Pretty much for mixins.
    this.el.object3D.rotation.set(0, 0, 0)
  }
})
// hide when AR mode 
AFRAME.registerComponent('noar',{
	init:function() {
		const sc = this.el.sceneEl
		sc.addEventListener("enter-vr", ev=>{
			if(sc.states!="ar-mode") return
			this.el.setAttribute("visible",false )
		})
		sc.addEventListener("exit-vr", ev=>{
			this.el.setAttribute("visible",true )
		})
	},
})
//moji panel
AFRAME.registerComponent('cpanel',{
	schema: {
		text:{default:[""]},
		ppm:{default:512},
		font:{default:"40px monospace"},
		color:{default:"#222"},
		clearColor:{default:"#fff0"},
		lheight:{default:40},
		margin:{type:"vec2",default:{'x':0,'y':0}}
	},
	init:function() {
		const elg = this.el.components.geometry.data
		const data = this.data
		if(this.el.innerHTML!="") this.data.text=this.el.innerHTML.split("\n")
		this.pcanvas = document.createElement('canvas') ;
		this.pcanvas.width = data.ppm * elg.width ;
		this.pcanvas.height = data.ppm * elg.height ;	
		this.data.lines = Math.floor(this.pcanvas.height/data.lheight)
		this.j2c = new json2canvas(this.pcanvas)
		this.j2c.default.font = data.font
		this.j2c.default.textColor = data.color
		this.clearColor = data.clearColor 
		this.ctx = this.j2c.ctx
		this.dd = []
		let y = data.lheight + data.margin.y 
		let w = this.pcanvas.width - data.margin.x * 2 
		for(let i=0;i<data.lines;i++,y+=data.lheight) 
			this.dd.push({shape:"text",str:"",x:data.margin.x,y:y,width:w})
		this.j2c.draw(this.dd)
		this.el.setAttribute("material","src",this.pcanvas)
	},
	update:function() {
		const data = this.data
		this.j2c.clear(this.clearColor)
		for(let i=0;i<data.lines;i++) 
		if(data.text[i]!==undefined) this.dd[i].str = data.text[i]
			this.j2c.draw(this.dd)

		let material = this.el.getObject3D('mesh').material
		if (!material.map) return
		material.map.needsUpdate = true
	}
})

})()