#!/bin/bash
set -e

echo
echo "***************************"
echo "*** Installing GPU libs ***"
echo "***************************"

wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/cuda-ubuntu1804.pin
mv cuda-ubuntu1804.pin /etc/apt/preferences.d/cuda-repository-pin-600
apt-key adv --fetch-keys https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/7fa2af80.pub
add-apt-repository "deb https://developer.download.nvidia.com/compute/cuda/repos/ubuntu1804/x86_64/ /"
apt-get update -y
apt-get -y install cuda-11-2
echo -n "/usr/lib/x86_64-linux-gnu/libnvidia-opencl.so.1">/etc/OpenCL/vendors/nvidia.icd

cd /usr/local/src/
git clone https://github.com/pyopencl/pyopencl --branch v2021.1.1
cd pyopencl
git submodule update --init
python3 configure.py
printf '%s\n' \
  "CL_TRACE = False" \
  "CL_ENABLE_GL = False" \
  "CL_USE_SHIPPED_EXT = False" \
  "CL_INC_DIR = ['/usr/local/cuda/targets/x86_64-linux/include']" \
  "CL_LIB_DIR = ['/usr/local/cuda-11.2/targets/x86_64-linux/lib']" \
  "CL_LIBNAME = ['OpenCL']" \
  "CL_LIBNAME = ['OpenCL']" \
  "CXXFLAGS = ['-fvisibility=hidden']" \
  "LDFLAGS = ['-Wl,--no-as-needed']" \
  > siteconf.py
pip3 install pybind11
pip3 install mako
su -c "make install"
pip3 install numpy --upgrade --force-reinstall
