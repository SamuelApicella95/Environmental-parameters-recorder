import picamera
camera = picamera.PiCamera()
camera.vflip = True
camera.hflip = True
camera.capture('image.png')
#camera.start_preview()
