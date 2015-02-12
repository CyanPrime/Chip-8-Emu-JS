// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success! All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

var debug = false;
var printCall = false;
var errorOn0 = false;
var game = new Array();
var error = false;
var customKeyMap = false;
var refreshScreen = 0;

var gameKeyMap = {"BRIX":   
					{
						37: 52,
						39: 87
					},
							
				  "INVADERS":  
					{
						37: 52,
						39: 87,
						90: 81
					},
					
				   "PONG":  
					{
						87: 49,
						83: 52,
						38: 70,
						40: 90
					},
				}

var gameKeyMapHTML = {
						"BRIX": 'Move left: Left arrow.<br />Move right: Right arrow.',
						"INVADERS": 'Move left: Left arrow.<br />Move right: Right arrow.<br />Z: Shoot.',
						"PONG": 'Move up P1: W.<br />Move down P1: S.<br />Move up P2: Up arrow.<br />Move down P2: Down arrow.'
					}

var curGameKeys;

/*var gameKeyMap = {{
		49: 0x1, // 1
		50: 0x2, // 2
		51: 0x3, // 3
		52: 0x4, // 4
		81: 0x5, // Q
		87: 0x6, // W
		69: 0x7, // E
		82: 0x8, // R
		65: 0x9, // A
		83: 0xA, // S
		68: 0xB, // D
		70: 0xC, // F
		90: 0xD, // Z
		88: 0xE, // X
		67: 0xF, // C
		86: 0x10 // V
	}};*/

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files; // FileList object.
	var file = files[0];

	curGameKeys = gameKeyMap[file.name]; 
	
	if(curGameKeys != undefined){
		customKeyMap = true;
		document.getElementById("controls").innerHTML = gameKeyMapHTML[file.name];
	}
	
	else{
		customKeyMap = false;
		document.getElementById("controls").innerHTML = "No custom controls.";
	}
		
	var reader = new FileReader();
	reader.onload = function(e) {
		if(debug) console.log(e.target.result.byteLength);
		game = new Uint8Array(e.target.result);
		
		startEmu();
	};

	reader.onerror = function(e) {
		console.log(e);
	};
	reader.readAsArrayBuffer(file);
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementById('drop_zone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);

var chip8 = function(){
	this.reset();
}

chip8.prototype.reset = function(){
	this.opcode = 0; //two bytes long
	
	var memory = new ArrayBuffer(0x1000); 
	this.memory = new Uint8Array(memory);
	
	// Reset memory.
	for (i = 0; i < this.memory.length; i++) {
		this.memory[i] = 0;
	}
		
	this.chip8_fontset = 
	[
	  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
	  0x20, 0x60, 0x20, 0x20, 0x70, // 1
	  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
	  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
	  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
	  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
	  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
	  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
	  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
	  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
	  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
	  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
	  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
	  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
	  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
	  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
	];
	
	for (i = 0; i < this.chip8_fontset.length; i++) {
		this.memory[i] = this.chip8_fontset[i];
	}
	
	this.V = new Array(16);
	
	for(var i = 0; i < this.V.length; i++){
		this.V[i] = 0;
	}
	
	//0x000 to 0xFFF
	this.I = 0; // two bytes long(?)
	this.pc = 0x200; // two bytes long(?)
	if(debug) console.log("pc: " + this.pc);
	//total of 2048 
	this.gfx = new Array(64 * 32);
	
	for(var x = 0; x < 64; x++){
		for(var y = 0; y < 32; y++){
			this.gfx[(y * 64) + x] = 0;
		}
	}
	
	this.delay_timer = 0; // 1 byte long(?)
	this.sound_timer = 0; // 1 byte long(?)
	
	this.stack = new Array(16); // 2 bytes long(?) - ushort
	this.sp = 0; // 2 bytes long(?) - ushort
	
	this.key = new Array(16); // 1 bytes long(?) - uchar
	
	for(var i = 0; i < 16; ++i){
		this.key[i] = false;
	}
    //0x00E0 – Clears the screen
    //0xDXYN – Draws a sprite on the screen
	this.draw = false;
	this.waitForKey = false;
	this.keyPress = false;
	
	this.keyMap = {
	49: 0x1, // 1
	50: 0x2, // 2
	51: 0x3, // 3
	52: 0x4, // 4
	81: 0x5, // Q
	87: 0x6, // W
	69: 0x7, // E
	82: 0x8, // R
	65: 0x9, // A
	83: 0xA, // S
	68: 0xB, // D
	70: 0xC, // F
	90: 0xD, // Z
	88: 0xE, // X
	67: 0xF, // C
	86: 0x10 // V
	};
	this.currentKey = false;
	
	this.state = 0;
}

chip8.prototype.loadGame = function(myGame){
	for(var i = 0; i < myGame.byteLength; ++i){
		//0x200 == 512.
		this.memory[i + 0x200] = myGame[i];
	}
}

chip8.prototype.cycle = function(){
	// Fetch Opcode
	this.opcode = this.memory[this.pc] << 8 | this.memory[this.pc + 1];
	var x = (this.opcode & 0x0F00) >> 8;
	var y = (this.opcode & 0x00F0) >> 4;
	
	 
	// Update timers
	if(this.delay_timer > 0) this.delay_timer--;
	if(this.sound_timer > 0) this.sound_timer--;
	
	//console.log("this.pc: " + this.pc);
	
	// Decode Opcode
	switch(this.opcode & 0xF000){
		case 0x0000:
			switch(this.opcode & 0x00FF)
			{ 
				//case 0x0000:
					//this.pc += 2;
				//break;
			
				case 0x00E0: // 0x00E0: Clears the screen 
					if(printCall) console.log("0x00E0: clear the screen");
					for(var x = 0; x < 64; x++){
						for(var y = 0; y < 32; y++){
							this.gfx[(y * 64) + x] = 0;
						}
					}
					this.draw = true;
					
					//this.pc += 2;
					//this.state = 1;
				break;
			 
				case 0x00EE: // 0x00EE: Returns from subroutine 
					if(printCall) console.log("0x00EE: Returns from subroutine");
					//try uncommenting this first...
					//	this.pc += 2;
					if(debug) console.log("this.pc: " + this.pc);
					if(debug) console.log("this.stack[this.sp]: " + this.stack[this.sp]);
					this.pc = this.stack[this.sp];
					if(debug) console.log("this.pc: " + this.pc);
					
					if(debug) console.log("this.sp;1: " + this.sp);						 
					this.sp--;
					if(debug) console.log("this.sp;2: " + this.sp);
					//this.state = 1;
				break;
		 
				default:
					if(errorOn0){
						console.log("Unknown opcode: " + this.opcode.toString(16));
						error = true;
					}
				break;				
			}
		break;
		 // JP addr
		// 1nnnn
		// Jump to location nnn
		case 0x1000:
			if(printCall) console.log("0x1000: jump to addr = " + (this.opcode & 0x0FFF));
			if(debug) console.log("jump to addr: " + (this.opcode & 0x0FFF));	
			this.pc = this.opcode & 0x0FFF;
			this.state = 0;
			//this.pc += 2;
		break;

		case 0x2000:
			//draw flicker, and no inf loop if commented out.
//			this.pc += 2;
			if(printCall) console.log("0x2000: Calls subroutine at = " + (this.opcode & 0x0FFF));
			if(debug) console.log("Calls subroutine at: " + (this.opcode & 0x0FFF));	
			if(debug) console.log("full code: " + this.opcode.toString(16));
			
			if(debug) console.log("this.sp;1: " + this.sp);
			this.sp++;
			if(debug) console.log("this.sp;2: " + this.sp);
			
			if(debug) console.log("this.stack[this.sp]: " + this.stack[this.sp]);
			this.stack[this.sp] = this.pc;
			if(debug) console.log("this.stack[this.sp]2: " + this.stack[this.sp]);
			
			if(debug) console.log("this.pc1: " + this.pc);
			this.pc = this.opcode & 0x0FFF;
			if(debug) console.log("this.pc2: " + this.pc);
			
			this.state = 0;
		break;
		
		case 0x3000: // 0x3XNN: Skips the next instruction if VX equals NN
			if(printCall) console.log("0x3XNN - skip if equal: " + this.V[x] + " = " + (this.opcode & 0x00FF));
			if(this.V[x] == (this.opcode & 0x00FF)){
				//this.pc += 4;
				this.state = 2;
			}
			else{
				//this.pc += 2;
				//this.state = 1;
			}
		break;
		
		case 0x4000: // 0x4XNN: Skips the next instruction if VX doesn't equals NN
			if(printCall) console.log("0x4XNN - skip if not equal: " + this.V[x] + " = " + (this.opcode & 0x00FF));
			if(this.V[x] != (this.opcode & 0x00FF)){
				//this.pc += 4;
				this.state = 2;
			}
			else{
				//this.pc += 2;
				//this.state = 1;
			}
		break;
		
		case 0x5000: // 0x5XNN: Skips the next instruction if VX equals VY
			if(printCall) console.log("0x5XNN - skip if equal: " + this.V[x] + " = " + this.V[y]);
			if(this.V[x] == this.V[y]){
				//this.pc += 4;
				this.state = 2;
			}
			else{
				//this.pc += 2;
				//this.state = 1;
			}
		break;
		
		//6XNN
		//V[X] = NN;
		case 0x6000:
			if(printCall) console.log("0x6XNN - set V[X] to NN: this.V[x](" + this.V[x] + ") = " + (this.opcode & 0x00FF));
			if(debug) console.log("call opcode: 6XNN");
			console.log("full opcode: " + this.opcode.toString(16));
			console.log("this.V[x] =" + this.V[x] );
			console.log("(this.opcode & 0x00FF) =" + (this.opcode & 0x00FF) );
			if(debug) console.log("(this.opcode & 0x00FF) 16 =" + (this.opcode & 0x00FF).toString(16));
			this.V[x] = (this.opcode & 0x00FF);
			console.log("this.V[x]2 =" + this.V[x] );
			//this.pc += 2;
			//this.state = 1;
			this.state = 1;
		break;
		
		//7XNN
		//Adds NN to VX.
		case 0x7000:
			var val =  this.V[x] + (this.opcode & 0x00FF);
			
			if (val > 255) {
				val -= 256;
			}
			if(printCall) console.log("0x7XNN -  V[X] += NN: this.V[x](" + this.V[x] + ") = " + val);
			//error = true;
			this.V[x] = val;
			//this.pc += 2;
			//this.state = 1;
		break;
		
		
		
		case 0x8000:
			switch((this.opcode & 0x000f)){
				//8XY0
				//Sets VX to the value of VY.
				case 0x0000:
					if(printCall) console.log("0x8XY0 - Set VX to VY");
					this.V[x] = this.V[y];
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY1
				//Sets VX to VX OR VY.
				case 0x0001:
					if(printCall) console.log("0x8XY1 - Set VX to VX OR VY");
					this.V[x] |= this.V[y];
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY2
				//Sets VX to VX AND VY.
				case 0x0002:
					if(printCall) console.log("0x8XY2 - Set VX to VX AND VY");
					this.V[x] &= this.V[y];
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY3
				//Sets VX to VX XOR VY.
				case 0x0003:
					if(printCall) console.log("0x8XY3 - Set VX to VX XOR VY");
					this.V[x] ^= this.V[y];
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY4
				//Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't.
				case 0x0004:
					if(printCall) console.log("0x8XY4 - Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't.");
					var sum = this.V[x] + this.V[y];
					if(sum > 0xFF){
						this.V[0xF] = 0;
						sum -= 256; //needs to be here for invaders to run
					}
					else
						this.V[0xF] = 1;
					
					this.V[x]  = sum;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY5
				//VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
				case 0x0005:
					if(printCall) console.log("0x8XY5 - VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.");
					//switch around the borrow flags to play invaders properly.
					if(this.V[x] > this.V[y])
						this.V[0xF] = 1; // there's a borrow.
					else
						this.V[0xF] = 0;
					
					this.V[x] -= this.V[y];
					//if(this.V[x] < 0) this.V[x] == 256;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY6
				//Shifts VX right by one. VF is set to the value of the least significant bit of VX before the shift.
				case 0x0006:
					if(printCall) console.log("0x8XY6 - Shifts VX right by one. VF is set to the value of the least significant bit of VX before the shift.");
					this.V[0xF] = this.V[x] & 0x1;
					this.V[x] >>= 1;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XY7
				// 	Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
				case 0x0007:
					if(printCall) console.log("0x8XY7 - Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.");
					if(this.V[y] > this.V[x])
						this.V[0xF] = 0; // there's a borrow.
					else
						this.V[0xF] = 1;
					
					this.V[x] = this.V[y] - this.V[x];
					if(this.V[x] < 0) this.V[x] == 256;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				//8XYE
				//Shifts VX left by one. VF is set to the value of the most significant bit of VX before the shift.
				case 0x000E:
					if(printCall) console.log("8XYE - Shifts VX left by one. VF is set to the value of the most significant bit of VX before the shift.");
					this.V[0xF] = +( this.V[x] & 0x80); // CHANGED
					this.V[x] <<= 1; // CHANGED
					if(this.V[x] > 255) this.V[x] -= 256;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		case 0x9000: // 9XY0:  Skips the next instruction if VX doesn't equal VY.
			if(printCall) console.log("9XY0 - Skips the next instruction if VX(" + this.V[x] + ") doesn't equal VY(" + this.V[y] + ").");
					
			if(this.V[x] != this.V[y]){
				this.state = 2;
				//this.pc += 4;
			}
			else{
				//this.pc += 2;
				//this.state = 1;
			}
		break;
		
		//ANNN
		//I = NNN;
		case 0xA000:// Execute Opcode
			if(printCall) console.log("ANNN - I(" + this.I + ") = NNN(" + (this.opcode & 0xFFF) + ").");
					
			if(debug) console.log("set I to: " + (this.opcode & 0xFFF));	
			this.I = (this.opcode & 0xFFF);
			//this.pc += 2;
			//this.state = 1;
		break;
		
		case 0xB000: // BNNN: Jumps to the address NNN plus V0
			if(printCall) console.log("BNNN - PC(" + this.pc + ") = NNN(" + (this.opcode & 0xFFF) + ") + V[0]("+this.V[0]+").");
			this.pc = (this.opcode & 0x0FFF) + this.V[0];
		break;
		
		case 0xC000: // CXNN: Sets VX to a random number and NN
			if(printCall) console.log("CXNN - Sets V(" + this.pc + ") = Random +  NN(" + (this.opcode & 0xFFF) + ").");
			
			this.V[x] = Math.floor(Math.random()*0xFF) & (this.opcode & 0x00FF);
			//this.state = 1;
		break;
		
		case 0xD000:
			if(printCall) console.log("0xDXYN - Draw screen.");
			if(debug) console.log("call opcode 0xDXYN");
			if(debug) console.log("full opcode: " + this.opcode.toString(16));	
			var dx = this.V[x];
			var dy = this.V[y];
			var height = (this.opcode & 0x000F);
			var pixel;
			
			this.V[0xF] = 0;
			for(var yLine = 0; yLine < height; yLine++){
				pixel = this.memory[this.I + yLine];
				for(var xLine = 0; xLine < 8; xLine++){
					if((pixel & (0x80 >> xLine)) != 0){
						var px = dx + xLine;
						var py = dy + yLine;
						
						if(py >= 64){
							py-= 64;
						}
						if(py < 0){
							py += 64;
						}
						if(py >= 32){
							py-= 32;
						}
						if(py < 0){
							py += 32;
						}
						
						if(this.gfx[px + (py * 64)] == 1){
							//for collision detection (hit this pixel)
							this.V[0xF] = 1;
						}
						
						this.gfx[px + (py * 64)] ^= 1;
					}
				}
			}
			
			this.draw = true;
			//this.pc += 2;
			//this.state = 1;
		break;
		
		case 0xE000:
			switch((this.opcode & 0x00FF)){
				//EX9E
				//Skips the next instruction if the key stored in VX is pressed.
				case 0x009E:
					if(printCall) console.log("EX9E +" + this.key[this.V[x]]);
				
					if(this.key[this.V[x]] > 0){
						//this.pc += 2;
						this.state = 2;
					}
					else{
						//this.state = 1;
						//this.pc += 2;
					}
				break;
				
				//EXA1
				//Skips the next instruction if the key stored in VX isn't pressed.
				case 0x00A1:
					if(printCall) console.log("0x00A1: key = " + this.key[this.V[x]]);
					if(this.key[this.V[x]] == 0){
						if(debug) console.log("key in VX not pressed. Skip");
						//this.pc += 2;
						this.state = 2;
					}
					else{
						if(debug) console.log("key in VX pressed. No Skip");
						//this.pc += 2;
					//	this.state = 1;
					}
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		case 0xF000:
			switch(this.opcode & 0x00FF){
				
				//FX07
				//Sets VX to the value of the delay timer.
				case 0x0007:
					if(printCall) console.log("FX07 - Sets VX to the value of the delay timer.");
					this.V[x] = this.delay_timer;
					//this.pc += 2;
					//this.state = 1;
				break;
				
				case 0x000A: // FX0A: A key press is awaited, and then stored in VX		
				{
					console.log("FX0A - await key press.");
					//this.pc += 2;
					//this.state = 1;
					if(!this.currentKey){
						return;
					}else{
						if(debug) console.write("this.currentKey = " + this.currentKey);
						this.key[this.V[x]] = this.currentKey;
					}
					
										
				}
				break;
				
				case 0x0015:
					if(printCall) console.log("FX15 - delay timer equals VX.");
					this.delay_timer = this.V[x];
					//this.pc += 2;		
					//this.state = 1;
				break;
				
				case 0x0018:
					if(printCall) console.log("FX18 - sound timer equals VX.");
					this.sound_timer = this.V[x];
					//this.pc += 2;		
					//this.state = 1;
				break;
				
				case 0x001E: // FX1E: Adds VX to I
					if(printCall) console.log("FX1E: Adds VX to I");
					/*if(this.I + this.V[x] > 0xFFF)	// VF is set to 1 when range overflow (I+VX>0xFFF), and 0 when there isn't.
						this.V[0xF] = 1;
					else
						this.V[0xF] = 0;*/
					this.I += this.V[x];
					//this.pc += 2;
					//this.state = 1;
				break;

				case 0x0029: // FX29: Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font
					if(printCall) console.log("FX29: Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font");
					this.I = this.V[x] * 0x5;
					//this.pc += 2;
					//this.state = 1;
				break;

				case 0x0033: // FX33: Stores the Binary-coded decimal representation of VX at the addresses I, I plus 1, and I plus 2
					if(printCall) console.log("FX33: Stores the Binary-coded decimal representation of VX at the addresses I, I plus 1, and I plus 2");
					this.memory[this.I]     = this.V[x] / 100;
					this.memory[this.I + 1] = (this.V[x] / 10) % 10;
					this.memory[this.I + 2] = (this.V[x] % 100) % 10;					
					//this.pc += 2;
					//this.state = 1;
				break;

				case 0x0055: // FX55: Stores V0 to VX in memory starting at address I
					if(printCall) console.log("FX55: Stores V0 to VX in memory starting at address I");
					for (var i = 0; i <= x; ++i)
						this.memory[this.I + i] = this.V[i];	

					// On the original interpreter, when the operation is done, I = I + X + 1.
					this.I += (x + 1);
					//this.pc += 2;
					//this.state = 1;
				break;
				
				case 0x0065: // FX65: Fills V0 to VX with values from memory starting at address I	
					if(printCall) console.log("FX65: Fills V0 to VX with values from memory starting at address I");
					for (var i = 0; i <= x; ++i)
						this.V[i] = this.memory[this.I + i];			

					// On the original interpreter, when the operation is done, I = I + X + 1.
					this.I += (x + 1);
					//this.pc += 2;
					//this.state = 1;
				break;
				
				default:
					console.log("Unknown opcode: " + this.opcode.toString(16));
				break;
			}
		break;
		
		default:
			console.log("Unknown opcode: " + this.opcode.toString(16));
		break;
	}
	
	this.pc += (2 * this.state);
	this.state = 1;
}

chip8.prototype.setKeys = function(){

}

//main
var myChip8 = new chip8();
	
 document.addEventListener("keydown", function(e) {
	if(e.keyCode == 13) error = true;
	else{
		if(customKeyMap){
			if(curGameKeys[e.keyCode] != undefined){
				console.log("down cust: " + curGameKeys[e.keyCode] + " || " + e.keyCode);
				myChip8.key[myChip8.keyMap[curGameKeys[e.keyCode]]] = true;
				myChip8.currentKey = myChip8.keyMap[curGameKeys[e.keyCode]];
			}
			
			else{
				console.log("down cust: unknown key");
				myChip8.key[myChip8.keyMap[e.keyCode]] = true;
				myChip8.currentKey = myChip8.keyMap[e.keyCode];
			}
		}
		
		else{
			console.log("down normal");
			myChip8.key[myChip8.keyMap[e.keyCode]] = true;
			myChip8.currentKey = myChip8.keyMap[e.keyCode];
		}
	}
});
	
document.addEventListener("keyup", function(e) {
	if(customKeyMap){
		if(curGameKeys[e.keyCode] != undefined) myChip8.key[myChip8.keyMap[curGameKeys[e.keyCode]]] = false;
		else myChip8.key[myChip8.keyMap[e.keyCode]] = false;
	}
	else myChip8.key[myChip8.keyMap[e.keyCode]] = false;
	myChip8.currentKey = false;
});
	
var startEmu = function(){
	//setup graphics
	//setup input

	myChip8.reset(); //(?)
	myChip8.loadGame(game);
	
	setInterval(function(){ mainLoop() }, (1000/60)/30);
	
	//make not inf
	

	//---------------------------------
	//testing
	//---------------------------------

	//myChip8.cycle();
}

var mainLoop = function(){
	//for(var i = 0; i <= 60; i++){
		if(!error){
			myChip8.cycle();
			
			if(myChip8.draw){
				//if(refreshScreen < 0){
					//ctx.fillStyle = "#222222";
					//ctx.fillRect(0,0,640,480);
				//	refreshScreen = 60;
				//}
				
				drawGraphics();
				
			}
			
			//refreshScreen--;
			
			myChip8.setKeys();
		}
	//}
}

var c = document.getElementById("screen");
var ctx = c.getContext("2d");

var drawGraphics = function(){
	ctx.fillStyle = "#222222";
	ctx.fillRect(0,0,640,480);
	
	ctx.fillStyle = "#444444";
	for(var x = 0; x < 64; x++){
		for(var y = 0; y < 32; y++){
			if(myChip8.gfx[x + (y * 64)]){
				//console.log("gfx: " + myChip8.gfx[(y * 64) + x]);
				ctx.fillRect(x * 10,y * 10,10,10);
			}
			//console.log("gfx: " + myChip8.gfx[(y * 64) + x]);
		}
	}
	
	this.draw = false;
}