import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { eraseCookie, getCookie, setCookie, getGuestOrderIds } from '../utils/cookie';
import FeedbackForm from './FeedbackForm';
import { useOrderWebSocket } from '../hooks/useOrderWebSocket';
import { groupOrderItems, getStatusText, getStatusColor, getItemStatusText } from '../utils/orderUtils';
import { API_ENDPOINTS } from '../utils/apiConfig';
import { showDialog, showConfirm, showError, showSuccess, showInfo, showWarning } from '../utils/dialog';
import './OrderStatus.css';

const OrderStatus = React.memo(({ orderId, onBack }) => {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [menus, setMenus] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('menus');
  const [note, setNote] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // State cho việc chọn nhiều món
  const [selectedItems, setSelectedItems] = useState([]); // Array of {item, quantity, note}
  
  // State để track khi nào được phép sửa đơn hàng
  const [canEditOrder, setCanEditOrder] = useState(false);
  
  // State cho popup thông báo waiter response
  const [showWaiterResponseModal, setShowWaiterResponseModal] = useState(false);
  const [waiterResponseData, setWaiterResponseData] = useState(null);
  
  // Ref để track đã hiển thị thông báo hủy đơn hàng chưa (tránh re-render)
  const hasShownCancellationAlertRef = useRef(false);
  
  // State cho editing mode - lưu các thay đổi tạm thời
  const [pendingChanges, setPendingChanges] = useState({
    itemsToAdd: [],
    itemsToRemove: []
  });
  
  // State để hiển thị order items trên frontend (bao gồm cả pending changes)
  const [displayOrderItems, setDisplayOrderItems] = useState([]);
  
  // State để lưu tổng tiền đã tính toán từ displayOrderItems
  const [calculatedTotalAmount, setCalculatedTotalAmount] = useState(0);
  
  // State cho loading khi refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State để lưu rank label (tên hạng) của khách hàng
  const [rankLabel, setRankLabel] = useState(null);

  // Ref để lưu trữ trạng thái order trước đó
  const prevOrderRef = useRef(null);

  // Kiểm tra cookie và validate order ngay khi component mount
  useEffect(() => {
    const checkCookieAndValidateOrder = async () => {
      const currentOrderId = getCookie('current_order_id');
      const guestOrderIds = getGuestOrderIds();
      
      console.log('Initial cookie check - currentOrderId:', currentOrderId);
      console.log('Initial cookie check - guestOrderIds:', guestOrderIds);
      console.log('Initial cookie check - orderId:', orderId);
      console.log('Initial cookie check - includes:', guestOrderIds.includes(orderId));
      
      // Nếu orderId không có trong cookie, kiểm tra trực tiếp với database
      if (!currentOrderId && !guestOrderIds.includes(orderId)) {
        try {
          const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(orderId));
          const data = await response.json();
          
          if (!data.success) {
            console.log('Order not found in database, redirecting to menu immediately');
            navigate('/reservation');
            return true; // Indicate redirect happened
          }
        } catch (err) {
          console.log('Error validating order, redirecting to menu');
          navigate('/reservation');
          return true;
        }
      }
      return false; // No redirect needed
    };

    const shouldRedirect = checkCookieAndValidateOrder();
    if (shouldRedirect) {
      return; // Don't proceed with other effects if redirecting
    }
  }, [orderId, navigate]);

  // Load editing state từ cookie khi component mount
  useEffect(() => {
    const editingState = getCookie('editing_order_' + orderId);
    if (editingState) {
      try {
        const parsed = JSON.parse(editingState);
        setCanEditOrder(parsed.canEditOrder || false);
        setPendingChanges(parsed.pendingChanges || { itemsToAdd: [], itemsToRemove: [] });
      } catch (error) {
        console.error('Error parsing editing state from cookie:', error);
      }
    }
  }, [orderId]);

  // Save editing state vào cookie khi có thay đổi
  useEffect(() => {
    if (canEditOrder || pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0) {
      const editingState = {
        canEditOrder,
        pendingChanges
      };
      setCookie('editing_order_' + orderId, JSON.stringify(editingState), 1); // 1 day
    } else {
      eraseCookie('editing_order_' + orderId);
    }
  }, [canEditOrder, pendingChanges, orderId]);

  // Cập nhật displayOrderItems khi order hoặc pendingChanges thay đổi
  useEffect(() => {
    if (order && order.orderItems) {
      // Debug: Log để kiểm tra
      console.log('🔄 Updating displayOrderItems, orderItems:', order.orderItems);
      console.log('🔄 orderItems length:', order.orderItems?.length);
      
      // Lấy các món không bị xóa
      const itemsToKeep = order.orderItems.filter(item => 
        !pendingChanges.itemsToRemove.includes(item._id)
      );
      
      console.log('🔄 itemsToKeep:', itemsToKeep);
      if (itemsToKeep.length > 0) {
        console.log('🔄 First itemToKeep:', {
          _id: itemsToKeep[0]._id,
          itemName: itemsToKeep[0].itemName,
          quantity: itemsToKeep[0].quantity,
          price: itemsToKeep[0].price
        });
      }
      
      // Thêm các món mới vào cuối danh sách
      const newItems = pendingChanges.itemsToAdd.map(change => ({
        _id: `temp_${change.item._id}_${change.type}`, // ID tạm thời
        itemId: change.item._id,
        itemName: change.item.name,
        itemType: change.type,
        quantity: change.quantity,
        price: change.item.price,
        note: change.note,
        status: 'pending',
        isTemporary: true // Đánh dấu là món tạm thời
      }));
      
      // Merge các món giống nhau
      const mergedItems = [...itemsToKeep];
      
      newItems.forEach(newItem => {
        // Tìm món giống nhau (cùng itemId, itemType, note)
        const existingIndex = mergedItems.findIndex(existing => 
          existing.itemId === newItem.itemId && 
          existing.itemType === newItem.itemType &&
          existing.note === newItem.note
        );
        
        if (existingIndex !== -1) {
          // Nếu tìm thấy món giống nhau, tăng số lượng
          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity: mergedItems[existingIndex].quantity + newItem.quantity,
            isTemporary: true // Đánh dấu là đã được sửa đổi
          };
        } else {
          // Nếu không tìm thấy, thêm món mới
          mergedItems.push(newItem);
        }
      });
      
      setDisplayOrderItems(mergedItems);
      
      // Tính tổng tiền từ displayOrderItems (tổng gốc, chưa trừ discount)
      const totalAmountBeforeDiscount = mergedItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      // Nếu có discount, trừ discount từ tổng gốc
      // Discount được tính dựa trên tổng gốc mới (nếu đang edit) hoặc dùng discount cũ
      const discount = order.discount || 0;
      const finalTotalAmount = totalAmountBeforeDiscount - discount;
      
      setCalculatedTotalAmount(finalTotalAmount);
    }
  }, [order, pendingChanges]);

  // Fetch rank label từ API loyalty-info
  const fetchRankLabel = useCallback(async () => {
    try {
      const token = getCookie('customer_token');
      if (!token) return;
      
      const response = await fetch(API_ENDPOINTS.CUSTOMER.LOYALTY_INFO, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success && data.data.rank) {
        setRankLabel(data.data.rank.label);
      }
    } catch (err) {
      console.error('Error fetching rank label:', err);
      // Không set error, chỉ log để không làm gián đoạn flow chính
    }
  }, []);

  // WebSocket connection
  const { connectionState, lastMessage, manualRefresh } = useOrderWebSocket(orderId);

  // Fetch order status function
  const fetchOrderStatus = useCallback(async () => {
    if (!orderId) {
      setError('Không tìm thấy ID đơn hàng');
      setLoading(false);
      return;
    }


    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(orderId));
      const data = await response.json();

      if (data.success) {
        setOrder(data.data);
        setError('');
        
        // Set canEditOrder dựa trên trạng thái order
        const order = data.data;
        
        // Fetch rank label nếu order có userId và có discount
        if (order.userId && order.discount > 0) {
          fetchRankLabel();
        } else {
          setRankLabel(null);
        }
        
        // Debug: Log orderItems để kiểm tra
        console.log('📦 Frontend received orderItems:', order.orderItems);
        if (order.orderItems && order.orderItems.length > 0) {
          console.log('📦 First orderItem:', {
            _id: order.orderItems[0]._id,
            itemName: order.orderItems[0].itemName,
            quantity: order.orderItems[0].quantity,
            price: order.orderItems[0].price,
            itemId: order.orderItems[0].itemId
          });
        }
        
        const isRejected = order.waiterResponse && order.waiterResponse.status === 'rejected';
        const isApproved = order.waiterResponse && order.waiterResponse.status === 'approved' && !order.customerConfirmed;
        
        // Debug: Log để kiểm tra giá trị
        console.log('Order status:', order.status);
        console.log('Waiter response:', order.waiterResponse);
        console.log('Is rejected:', isRejected);
        console.log('Is approved:', isApproved);
        console.log('Previous order:', prevOrderRef.current);
        console.log('Show modal:', showWaiterResponseModal);
        
        // Hiển thị popup thông báo waiter response - chỉ khi có thay đổi mới
        if (isRejected && !showWaiterResponseModal) {
          // Kiểm tra xem có phải lần đầu tiên detect rejected không
          const prevOrder = prevOrderRef.current;
          const wasNotRejectedBefore = !prevOrder || !prevOrder.waiterResponse || prevOrder.waiterResponse.status !== 'rejected';
          if (wasNotRejectedBefore) {
            setWaiterResponseData({
              type: 'rejected',
              reason: data.data.waiterResponse.reason
            });
            setShowWaiterResponseModal(true);
          }
        } else if (isApproved && !showWaiterResponseModal) {
          // Kiểm tra xem có phải lần đầu tiên detect approved không
          const prevOrder = prevOrderRef.current;
          const wasNotApprovedBefore = !prevOrder || !prevOrder.waiterResponse || prevOrder.waiterResponse.status !== 'approved';
          if (wasNotApprovedBefore) {
            setWaiterResponseData({
              type: 'approved',
              tableNumber: data.data.tableId?.tableNumber || null,
              servedBy: data.data.servedBy?.name || null
            });
            setShowWaiterResponseModal(true);
          }
        }
        
        // Cập nhật ref với order mới
        prevOrderRef.current = data.data;
        
        // Reset calculatedTotalAmount để sử dụng totalAmount từ backend
        setCalculatedTotalAmount(0);
        
        // Reset pendingChanges để đồng bộ với backend
        const resetPendingChanges = {
          itemsToAdd: [],
          itemsToRemove: []
        };
        setPendingChanges(resetPendingChanges);
        
        // Cập nhật cookie với pendingChanges đã reset
        setCookie('editing_order_' + orderId, JSON.stringify({
          canEditOrder: canEditOrder,
          pendingChanges: resetPendingChanges
        }), 1);
        
        // Không reset canEditOrder từ fetchOrderStatus - để cookie quản lý
        
        // Auto clear current_order_id cookie when order completed/cancelled
        // But keep the order in guest_order_ids for history
        if (data.data.status === 'paid' || data.data.status === 'cancelled') {
          eraseCookie('current_order_id');
        }
      } else {
        setError(data.message || 'Không thể tải thông tin đơn hàng');
        
        // Clear cookie if order not found or should be cleared
        if (data.shouldClearCookie || response.status === 404) {
          eraseCookie('current_order_id');
        }
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => {
    if (orderId) {
      hasShownCancellationAlertRef.current = false; // Reset alert flag for new order
      fetchOrderStatus();
    }
  }, [orderId, fetchOrderStatus]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      console.log('📨 OrderStatus received WebSocket message:', lastMessage);
    }
    
    if (lastMessage && lastMessage.type === 'order:updated' && lastMessage.orderId === orderId) {
      // Validate và đảm bảo orderItems có đầy đủ dữ liệu
      const orderData = lastMessage.data;
      console.log('📦 [Customer] Received order update:', {
        orderId: orderData?._id,
        status: orderData?.status,
        orderItemsCount: orderData?.orderItems?.length || 0,
        hasOrderItems: !!orderData?.orderItems
      });
      
      if (orderData && orderData.orderItems) {
        // Filter và validate orderItems
        const validatedOrderItems = orderData.orderItems.filter((item) => {
          if (!item) return false;
          // Phải có ít nhất _id hoặc itemName để xác định là OrderItem hợp lệ
          return item._id || item.itemName || (item.itemId && (typeof item.itemId === 'object' ? item.itemId.name : true));
        }).map((item) => {
          // Đảm bảo itemName luôn có giá trị
          if (!item.itemName && item.itemId) {
            if (typeof item.itemId === 'object' && item.itemId !== null) {
              item.itemName = item.itemId.name || item.itemName || '';
            }
          }
          // Đảm bảo price luôn có giá trị
          if (!item.price && item.itemId) {
            if (typeof item.itemId === 'object' && item.itemId !== null) {
              item.price = item.itemId.price || item.price || 0;
            }
          }
          // Đảm bảo comboItems luôn là array và có đầy đủ thông tin
          if (item.itemType === 'menu' && item.comboItems) {
            item.comboItems = item.comboItems.map((ci) => ({
              ...ci, // Giữ nguyên tất cả fields
              itemName: ci.itemName || (ci.itemId && typeof ci.itemId === 'object' ? ci.itemId.name : null) || 'Món đã xóa',
              status: ci.status !== undefined && ci.status !== null ? ci.status : 'pending',
            }));
          }
          return item;
        });
        
        console.log('📦 [Customer] Validated orderItems:', {
          count: validatedOrderItems.length,
          items: validatedOrderItems.map(item => ({
            itemName: item.itemName,
            itemType: item.itemType,
            comboItemsCount: item.comboItems?.length || 0
          }))
        });
        
        // Merge với order hiện tại để giữ lại comboItems không bị mất
        setOrder((prevOrder) => {
          if (!prevOrder) {
            return { ...orderData, orderItems: validatedOrderItems };
          }
          
          // Nếu order đã tồn tại, merge orderItems để giữ lại comboItems
          if (prevOrder.orderItems && prevOrder.orderItems.length > 0) {
            console.log('🔄 [Customer] Merging with existing order:', {
              existingItemsCount: prevOrder.orderItems.length,
              newItemsCount: validatedOrderItems.length
            });
            
            const mergedOrderItems = validatedOrderItems.map((newItem) => {
              const existingItem = prevOrder.orderItems.find(
                (ei) => (ei._id || ei.orderItemId) === (newItem._id || newItem.orderItemId)
              );
              
              // Nếu tìm thấy existing item và có comboItems, merge comboItems
              if (existingItem && existingItem.comboItems && newItem.comboItems) {
                console.log('🔄 [Customer] Merging comboItems for item:', {
                  itemName: newItem.itemName,
                  existingComboItemsCount: existingItem.comboItems.length,
                  newComboItemsCount: newItem.comboItems.length
                });
                
                // Merge comboItems: giữ status mới nhất từ newItem, nhưng giữ các field khác nếu thiếu
                const mergedComboItems = newItem.comboItems.map((newCi, ciIdx) => {
                  const existingCi = existingItem.comboItems[ciIdx];
                  if (existingCi) {
                    // Merge: ưu tiên data mới, nhưng giữ các field khác nếu thiếu
                    return {
                      ...existingCi, // Giữ tất cả fields cũ
                      ...newCi, // Override với data mới
                    };
                  }
                  return newCi;
                });
                
                // Nếu newItem có ít comboItems hơn existingItem, giữ lại các comboItems cũ
                if (mergedComboItems.length < existingItem.comboItems.length) {
                  console.warn('⚠️ [Customer] WARNING: New item has fewer comboItems than existing!', {
                    itemName: newItem.itemName,
                    existingCount: existingItem.comboItems.length,
                    newCount: mergedComboItems.length
                  });
                  // Giữ lại các comboItems cũ không có trong newItem
                  const missingComboItems = existingItem.comboItems.slice(mergedComboItems.length);
                  mergedComboItems.push(...missingComboItems);
                }
                
                return {
                  ...newItem,
                  comboItems: mergedComboItems,
                };
              }
              
              // Nếu existingItem có comboItems nhưng newItem không có, giữ lại comboItems từ existing
              if (existingItem && existingItem.comboItems && existingItem.comboItems.length > 0 && (!newItem.comboItems || newItem.comboItems.length === 0)) {
                console.warn('⚠️ [Customer] WARNING: New item missing comboItems, keeping from existing!', {
                  itemName: newItem.itemName,
                  existingComboItemsCount: existingItem.comboItems.length
                });
                return {
                  ...newItem,
                  comboItems: existingItem.comboItems, // Giữ lại comboItems từ existing
                };
              }
              
              return newItem;
            });
            
            // Nếu newOrder có ít items hơn existingOrder, giữ lại các items cũ
            if (mergedOrderItems.length < prevOrder.orderItems.length) {
              console.warn('⚠️ [Customer] WARNING: New order has fewer items than existing!', {
                existingCount: prevOrder.orderItems.length,
                newCount: mergedOrderItems.length
              });
              const missingItems = prevOrder.orderItems.filter(
                (ei) => !mergedOrderItems.some(
                  (mi) => (mi._id || mi.orderItemId) === (ei._id || ei.orderItemId)
                )
              );
              mergedOrderItems.push(...missingItems);
            }
            
            console.log('✅ [Customer] Merged order:', {
              itemsCount: mergedOrderItems.length,
              items: mergedOrderItems.map(item => ({
                itemName: item.itemName,
                comboItemsCount: item.comboItems?.length || 0
              }))
            });
            
            return {
              ...orderData,
              orderItems: mergedOrderItems,
            };
          }
          
          // Nếu không có existing orderItems, dùng validatedOrderItems
          return { ...orderData, orderItems: validatedOrderItems };
        });
      } else {
        // Nếu không có orderItems trong update, giữ lại orderItems từ order hiện tại
        console.warn('⚠️ [Customer] WARNING: Order update has no orderItems, keeping existing!');
        setOrder((prevOrder) => {
          if (prevOrder && prevOrder.orderItems) {
            return {
              ...orderData,
              orderItems: prevOrder.orderItems, // Giữ lại orderItems từ order hiện tại
            };
          }
          return orderData;
        });
      }
      
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
      
      // Auto clear current_order_id cookie when order completed/cancelled
      // But keep the order in guest_order_ids for history
      if (lastMessage.data.status === 'paid' || lastMessage.data.status === 'cancelled') {
        eraseCookie('current_order_id');
        
        // Close waiter response modal if order is cancelled
        if (lastMessage.data.status === 'cancelled') {
          console.log('🔄 Closing waiter response modal due to order cancellation');
          setShowWaiterResponseModal(false);
          setWaiterResponseData(null);
          setCanEditOrder(false); // Also disable edit mode
          // Show cancellation notification only once
          if (!hasShownCancellationAlertRef.current) {
            showError('Đơn hàng đã bị hủy!', 'Thông báo');
            hasShownCancellationAlertRef.current = true;
          }
        }
      }
    } else if (lastMessage && lastMessage.type === 'order:waiter_rejected' && lastMessage.orderId === orderId) {
      console.log('🚫 Order rejected by waiter:', lastMessage.data);
      setOrder(lastMessage.data.order);
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
      
      // Trigger popup cho waiter rejection
      setWaiterResponseData({
        type: 'rejected',
        reason: lastMessage.data.order.waiterResponse?.reason
      });
      setShowWaiterResponseModal(true);
    } else if (lastMessage && lastMessage.type === 'order:waiter_approved' && lastMessage.orderId === orderId) {
      console.log('✅ Order approved by waiter:', lastMessage.data);
      setOrder(lastMessage.data.order);
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
      
      // Trigger popup cho waiter approval
      setWaiterResponseData({
        type: 'approved',
        tableNumber: lastMessage.data.order.tableId?.tableNumber || null,
        servedBy: lastMessage.data.order.servedBy?.name || null
      });
      setShowWaiterResponseModal(true);
    } else if (lastMessage && lastMessage.type === 'order:item_updated' && lastMessage.orderId === orderId) {
      console.log('🍽️ Order item status updated:', lastMessage.data);
      setOrder(lastMessage.data.order);
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
    } else if (lastMessage && lastMessage.type === 'order:cancelled' && lastMessage.orderId === orderId) {
      console.log('❌ Order cancelled:', lastMessage.data);
      setOrder(lastMessage.data);
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
      
      // Clear cookie and close waiter response modal
      eraseCookie('current_order_id');
      console.log('🔄 Closing waiter response modal due to order:cancelled event');
      setShowWaiterResponseModal(false);
      setWaiterResponseData(null);
      setCanEditOrder(false); // Also disable edit mode
      
      // Show cancellation notification only once
      if (!hasShownCancellationAlertRef.current) {
        showError('Đơn hàng đã bị hủy!', 'Thông báo');
        hasShownCancellationAlertRef.current = true;
      }
    } else if (lastMessage && lastMessage.type === 'order:not_found' && lastMessage.orderId === orderId) {
      // Clear cookie if WebSocket reports order not found
      eraseCookie('current_order_id');
      setError('Đơn hàng không tồn tại');
    }
  }, [lastMessage, orderId]);

  // Auto clear current_order_id cookie when order completed/cancelled
  // But keep the order in guest_order_ids for history
  useEffect(() => {
    if (order && (order.status === 'paid' || order.status === 'cancelled')) {
      eraseCookie('current_order_id');
      
      // Close waiter response modal if order is cancelled
      if (order.status === 'cancelled') {
        console.log('🔄 Order status changed to cancelled, closing modal');
        setShowWaiterResponseModal(false);
        setWaiterResponseData(null);
        setCanEditOrder(false);
      }
    }
  }, [order]);

  const fetchMenusAndItems = async () => {
    try {
      const [menusRes, itemsRes] = await Promise.all([
        fetch(API_ENDPOINTS.CUSTOMER.MENUS),
        fetch(API_ENDPOINTS.CUSTOMER.ITEMS)
      ]);
      
      const menusData = await menusRes.json();
      const itemsData = await itemsRes.json();
      
      if (menusData.success) setMenus(menusData.data);
      if (itemsData.success) setItems(itemsData.data);
    } catch (err) {
      console.error('Error fetching menus and items:', err);
    }
  };

  // Thêm món vào danh sách đã chọn
  const addToSelectedItems = (item, type) => {
    const existingIndex = selectedItems.findIndex(selected => 
      selected.item._id === item._id && selected.type === type
    );
    
    if (existingIndex >= 0) {
      // Nếu món đã tồn tại, tăng số lượng
      setSelectedItems(prev => prev.map((selected, index) => 
        index === existingIndex 
          ? { ...selected, quantity: selected.quantity + 1 }
          : selected
      ));
    } else {
      // Nếu món chưa tồn tại, thêm mới
      setSelectedItems(prev => [...prev, {
        item: item,
        type: type,
        quantity: 1,
        note: ''
      }]);
    }
  };

  // Xóa món khỏi danh sách đã chọn
  const removeFromSelectedItems = (itemId, type) => {
    setSelectedItems(prev => prev.filter(selected => 
      !(selected.item._id === itemId && selected.type === type)
    ));
  };

  // Cập nhật số lượng món đã chọn
  const updateSelectedItemQuantity = (itemId, type, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromSelectedItems(itemId, type);
      return;
    }
    
    setSelectedItems(prev => prev.map(selected => 
      selected.item._id === itemId && selected.type === type
        ? { ...selected, quantity: newQuantity }
        : selected
    ));
  };

  // Cập nhật ghi chú cho món đã chọn
  const updateSelectedItemNote = (itemId, type, note) => {
    setSelectedItems(prev => prev.map(selected => 
      selected.item._id === itemId && selected.type === type
        ? { ...selected, note: note }
        : selected
    ));
  };

  // Thêm tất cả món đã chọn vào pending changes (chưa gửi lên server)
  const handleAddSelectedItemsToOrder = () => {
    if (selectedItems.length === 0) {
      showWarning('Vui lòng chọn ít nhất một món!', 'Cảnh báo');
      return;
    }
    
    // Thêm vào pending changes
    setPendingChanges(prev => ({
      ...prev,
      itemsToAdd: [...prev.itemsToAdd, ...selectedItems]
    }));
    
    // Lưu vào cookie
    const newChanges = {
      ...pendingChanges,
      itemsToAdd: [...pendingChanges.itemsToAdd, ...selectedItems]
    };
    setCookie('editing_order_' + orderId, JSON.stringify({
      canEditOrder: true,
      pendingChanges: newChanges
    }), 1);
    
    showSuccess(`Đã thêm ${selectedItems.length} món vào danh sách sửa đổi!`, 'Thành công');
    setShowAddItemModal(false);
    setSelectedItems([]);
  };


  const handleCancelOrder = async () => {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn hủy đơn hàng này?', 'Xác nhận hủy đơn hàng');
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(orderId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Clear current_order_id but keep in guest_order_ids for history
        eraseCookie('current_order_id');
        fetchOrderStatus(); // Refresh order status
        // Note: Alert will be shown via WebSocket event
      } else {
        showError(data.message || 'Không thể hủy đơn hàng', 'Lỗi');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      showError('Có lỗi xảy ra khi hủy đơn hàng', 'Lỗi');
    }
  };

  const handleFeedbackSubmitted = (feedbackData) => {
    console.log('Feedback submitted:', feedbackData);
    setShowFeedbackModal(false);
    showSuccess('Cảm ơn bạn đã đánh giá dịch vụ!', 'Thành công');
  };

  const handleShowFeedback = () => {
    setShowFeedbackModal(true);
  };

  // Handle request payment
  const handleRequestPayment = async () => {
    if (!orderId) {
      showError('Không tìm thấy ID đơn hàng', 'Lỗi');
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await fetch(API_ENDPOINTS.CUSTOMER.REQUEST_PAYMENT(orderId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(data.message, 'Thành công');
        // Refresh order status
        fetchOrderStatus();
      } else {
        showError(data.message || 'Không thể gửi yêu cầu thanh toán', 'Lỗi');
      }
    } catch (error) {
      console.error('Error requesting payment:', error);
      showError('Có lỗi xảy ra khi gửi yêu cầu thanh toán', 'Lỗi');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log('Manual refresh triggered');
      
      // Thay vì dùng manualRefresh, gọi trực tiếp fetchOrderStatus
      await fetchOrderStatus();
      
      setHasNewUpdate(true);
      setTimeout(() => setHasNewUpdate(false), 2000);
      console.log('Order refreshed successfully');
    } catch (error) {
      console.error('Error in manual refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartEditOrder = async () => {
    try {
      console.log('Starting edit order - removing table and waiter');
      
      const response = await fetch(API_ENDPOINTS.CUSTOMER.START_EDIT_ORDER(orderId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {

        // Đóng popup modal
        setShowWaiterResponseModal(false);
        setWaiterResponseData(null);
        // Bật edit mode
        setCanEditOrder(true);
        // Refresh order status
        fetchOrderStatus();
      } else {
        showError(data.message || 'Không thể bắt đầu sửa đơn hàng', 'Lỗi');
      }
    } catch (error) {
      console.error('Error starting edit order:', error);
      showError('Có lỗi xảy ra khi bắt đầu sửa đơn hàng', 'Lỗi');
    }
  };

  const handleConfirmOrder = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CUSTOMER.CONFIRM_ORDER(orderId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Đã xác nhận đơn hàng thành công!', 'Thành công');
        // Đóng popup modal
        setShowWaiterResponseModal(false);
        setWaiterResponseData(null);
        // Refresh order status
        fetchOrderStatus();
      } else {
        showError(data.message || 'Không thể xác nhận đơn hàng', 'Lỗi');
      }
    } catch (error) {
      console.error('Error confirming order:', error);
      showError('Có lỗi xảy ra khi xác nhận đơn hàng', 'Lỗi');
    }
  };

  const handleRemoveItem = async (orderItemId) => {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn xóa món này?', 'Xác nhận xóa món');
    if (!confirmed) {
      return;
    }

    // Kiểm tra xem đây có phải món tạm thời không
    const isTemporaryItem = orderItemId.startsWith('temp_');
    
    if (isTemporaryItem) {
      // Nếu là món tạm thời, xóa khỏi itemsToAdd
      setPendingChanges(prev => ({
        ...prev,
        itemsToAdd: prev.itemsToAdd.filter(change => 
          `temp_${change.item._id}_${change.type}` !== orderItemId
        )
      }));
      
      // Lưu vào cookie
      const newChanges = {
        ...pendingChanges,
        itemsToAdd: pendingChanges.itemsToAdd.filter(change => 
          `temp_${change.item._id}_${change.type}` !== orderItemId
        )
      };
      setCookie('editing_order_' + orderId, JSON.stringify({
        canEditOrder: true,
        pendingChanges: newChanges
      }), 1);
      
      showSuccess('Đã xóa món khỏi danh sách!', 'Thành công');
    } else {
      // Nếu là món thật, thêm vào itemsToRemove
      setPendingChanges(prev => ({
        ...prev,
        itemsToRemove: [...prev.itemsToRemove, orderItemId]
      }));
      
      // Lưu vào cookie
      const newChanges = {
        ...pendingChanges,
        itemsToRemove: [...pendingChanges.itemsToRemove, orderItemId]
      };
      setCookie('editing_order_' + orderId, JSON.stringify({
        canEditOrder: true,
        pendingChanges: newChanges
      }), 1);
      
      showSuccess('Đã thêm món vào danh sách xóa!', 'Thành công');
    }
  };

  // Function để cập nhật số lượng món
  const updateItemQuantity = (orderItem, newQuantity) => {
    // Validate số lượng cho cả món tạm thời và món thật
    if (newQuantity < 1 || newQuantity > 99) {
      console.warn('Invalid quantity:', newQuantity);
      return;
    }
    
    // Kiểm tra xem đây có phải món tạm thời không
    const isTemporaryItem = orderItem._id.startsWith('temp_');
    
    if (isTemporaryItem) {
      // Nếu là món tạm thời, cập nhật trong itemsToAdd
      setPendingChanges(prev => ({
        ...prev,
        itemsToAdd: prev.itemsToAdd.map(change => {
          const tempId = `temp_${change.item._id}_${change.type}`;
          if (tempId === orderItem._id) {
            return { ...change, quantity: newQuantity };
          }
          return change;
        })
      }));
      
      // Lưu vào cookie
      const newChanges = {
        ...pendingChanges,
        itemsToAdd: pendingChanges.itemsToAdd.map(change => {
          const tempId = `temp_${change.item._id}_${change.type}`;
          if (tempId === orderItem._id) {
            return { ...change, quantity: newQuantity };
          }
          return change;
        })
      };
      setCookie('editing_order_' + orderId, JSON.stringify({
        canEditOrder: true,
        pendingChanges: newChanges
      }), 1);
    } else {
      // Nếu là món thật, tạo một "quantity change" trong pendingChanges
      // Tạm thời chúng ta sẽ xử lý bằng cách thêm vào itemsToAdd với số lượng âm để giảm
      // và số lượng dương để tăng
      const quantityDiff = newQuantity - orderItem.quantity;
      
      if (quantityDiff !== 0) {
        setPendingChanges(prev => ({
          ...prev,
          itemsToAdd: [...prev.itemsToAdd, {
            item: { _id: orderItem.itemId, name: orderItem.itemName, price: orderItem.price },
            quantity: quantityDiff,
            type: orderItem.itemType,
            note: orderItem.note,
            isQuantityChange: true,
            originalItemId: orderItem._id
          }]
        }));
        
        // Lưu vào cookie
        const newChanges = {
          ...pendingChanges,
          itemsToAdd: [...pendingChanges.itemsToAdd, {
            item: { _id: orderItem.itemId, name: orderItem.itemName, price: orderItem.price },
            quantity: quantityDiff,
            type: orderItem.itemType,
            note: orderItem.note,
            isQuantityChange: true,
            originalItemId: orderItem._id
          }]
        };
        setCookie('editing_order_' + orderId, JSON.stringify({
          canEditOrder: true,
          pendingChanges: newChanges
        }), 1);
      }
    }
  };

  // Function để cập nhật đơn hàng (thay thế cho sendEditRequest)
  const updateOrderStatus = async () => {
    try {
      setIsRefreshing(true);
      console.log('updateOrderStatus called');
      
      // Sử dụng displayOrderItems đã được merge thay vì pendingChanges
      const newOrderItems = displayOrderItems.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        type: item.itemType,
        note: item.note || ''
      }));

      console.log('Sending order items to waiter:', newOrderItems);

      // Xóa tất cả món cũ trước
      const currentItems = order.orderItems || [];
      for (const item of currentItems) {
        const response = await fetch(API_ENDPOINTS.CUSTOMER.CANCEL_ORDER_ITEM(orderId, item._id), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const data = await response.json();
        if (!data.success) {
          console.warn('Warning: Could not remove item', item._id, data.message);
        }
      }

      // Thêm lại toàn bộ món mới
      if (newOrderItems.length > 0) {
        const response = await fetch(API_ENDPOINTS.CUSTOMER.ADD_ITEMS_TO_ORDER(orderId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderItems: newOrderItems
          })
        });
        
        const data = await response.json();
        if (!data.success) {
          showError('Lỗi khi cập nhật đơn hàng: ' + data.message, 'Lỗi');
          return;
        }
      }

      // Xóa cookie và reset state
      eraseCookie('editing_order_' + orderId);
      setPendingChanges({ itemsToAdd: [], itemsToRemove: [] });
      setCanEditOrder(false);
      
      showSuccess('Đã cập nhật đơn hàng thành công! Waiter sẽ xác nhận lại.', 'Thành công');
      fetchOrderStatus(); // Refresh order status
      
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Có lỗi xảy ra khi cập nhật đơn hàng', 'Lỗi');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchOrderStatus} className="retry-btn">
          Thử lại
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error">
        <p>Không tìm thấy thông tin đơn hàng</p>
      </div>
    );
  }

  return (
    <div>
      <div className="order-status-card">
        <div className="header">
          <h2>Trạng thái đơn hàng</h2>
          {order && order.status === 'pending' && (
            <button onClick={handleCancelOrder} className="cancel-order-btn">
              Hủy đơn hàng
            </button>
          )}
          {order && order.status !== 'pending' && (
            <button onClick={onBack} className="back-to-menu-btn">
              Quay lại menu
            </button>
          )}
        </div>

        <div className="order-info" style={{maxWidth: '98%'}}>
          <div className="info-row">
            <span className="label">Mã đơn hàng:</span>
            <span className="value">{order._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="info-row">
            <span className="label">Bàn số:</span>
            <span className="value">{order.tableId?.tableNumber || 'N/A'}</span>
          </div>
          {(() => {
            // Tính tổng tiền gốc (trước discount)
            // Nếu có calculatedTotalAmount (đang edit), tính từ displayOrderItems
            // Nếu không, dùng order.totalAmount + order.discount
            const totalBeforeDiscount = calculatedTotalAmount > 0 && (pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0)
              ? displayOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
              : (order.totalAmount + (order.discount || 0));
            
            const discount = order.discount || 0;
            const finalTotal = calculatedTotalAmount > 0 && (pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0)
              ? calculatedTotalAmount
              : order.totalAmount;
            
            if (discount > 0) {
              return (
                <>
                  <div className="info-row">
                    <span className="label">Tổng tiền gốc:</span>
                    <span className="value">{(totalBeforeDiscount || 0).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div className="info-row" style={{ color: '#28a745', fontWeight: 'bold' }}>
                    <span className="label">
                      Giảm giá {rankLabel ? `(hạng ${rankLabel.toLowerCase()})` : '(tự động)'}:
                    </span>
                    <span className="value">-{(discount || 0).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Tổng tiền:</span>
                    <span className="value price">{(finalTotal || 0).toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                </>
              );
            } else {
              return (
                <div className="info-row">
                  <span className="label">Tổng tiền:</span>
                  <span className="value price">{(finalTotal || 0).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              );
            }
          })()}
          {/* Hiển thị tiền cọc và số tiền còn lại nếu đơn là đặt trước và có tiền cọc */}
          {(order.status === 'preorder' || order.scheduledTime) && order.totalDeposit > 0 && (
            <>
              <div className="info-row" style={{ color: '#007bff', fontWeight: 'bold' }}>
                <span className="label">Tiền đã cọc:</span>
                <span className="value">{(order.totalDeposit || 0).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              {order.remainingAmount !== undefined && order.remainingAmount > 0 && (
                <div className="info-row" style={{ color: '#ff6b00', fontWeight: 'bold' }}>
                  <span className="label">Còn lại phải trả:</span>
                  <span className="value">{(order.remainingAmount || 0).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="status-section">
          <h3>Trạng thái hiện tại</h3>
          <div 
            className="current-status"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {getStatusText(order.status)}
          </div>
          
        </div>

        <div className="order-items">
          <div className="order-items-header">
            <h3>Món đã đặt</h3>
            <div className="header-actions">
              {canEditOrder && (
                <button onClick={() => {
                  setShowAddItemModal(true);
                  fetchMenusAndItems();
                }} className="add-item-btn">
                  Thêm món vào đơn hàng
                </button>
              )}
              {order && ['confirmed', 'preparing', 'served'].includes(order.status) && (
                <button 
                  onClick={handleRequestPayment} 
                  className="request-payment-btn"
                  disabled={isRefreshing}
                >
                  Yêu cầu thanh toán
                </button>
              )}
            </div>
          </div>
          
          <div className="items-list">
            {displayOrderItems.map((orderItem) => (
              <div key={orderItem._id} className={`order-item ${orderItem.isTemporary ? 'temporary-item' : ''}`}>
                <div className="item-info">
                  <span className="item-name">
                    {orderItem.itemName}
                    {orderItem.isTemporary && <span className="temp-indicator"> (Mới)</span>}
                  </span>
                  <span className="item-price">
                    {(orderItem.price || 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="item-quantity">
                  Số lượng: 
                  {canEditOrder ? (
                    <div className="quantity-controls">
                      <button 
                        onClick={() => {
                          if (orderItem.quantity > 1) {
                            updateItemQuantity(orderItem, orderItem.quantity - 1);
                          }
                        }}
                        className="quantity-btn"
                        disabled={orderItem.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={orderItem.quantity}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Chỉ cho phép số dương
                          if (inputValue === '' || inputValue === '-') return;
                          
                          const newQuantity = parseInt(inputValue);
                          if (isNaN(newQuantity) || newQuantity < 1 || newQuantity > 99) {
                            // Reset về giá trị cũ nếu không hợp lệ
                            e.target.value = orderItem.quantity;
                            return;
                          }
                          
                          updateItemQuantity(orderItem, newQuantity);
                        }}
                        className="quantity-input"
                      />
                      <button 
                        onClick={() => updateItemQuantity(orderItem, orderItem.quantity + 1)}
                        className="quantity-btn"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="quantity-display">{orderItem.quantity}</span>
                  )}
                </div>
                {orderItem.note && (
                  <div className="item-note">
                    Ghi chú: {orderItem.note}
                  </div>
                )}
                {orderItem.itemType && (
                  <div className="item-type">
                    Loại: {orderItem.itemType === 'menu' ? 'Combo' : 'Món ăn'}
                  </div>
                )}
                
                {/* Hiển thị trạng thái cho món đơn lẻ hoặc trạng thái combo (ở ngoài) */}
                {orderItem.itemType !== 'menu' || !orderItem.comboItems || orderItem.comboItems.length === 0 ? (
                  /* Hiển thị status cho món đơn lẻ */
                  orderItem.status && (
                    <div className="item-status-single">
                      <span className="item-status-label">Trạng thái:</span>
                      <span className={`status-badge status-${orderItem.status}`}>
                        {getItemStatusText(orderItem.status)}
                      </span>
                    </div>
                  )
                ) : (
                  /* Hiển thị trạng thái combo (ở ngoài combo items) */
                  orderItem.status && (
                    <div className="item-status-single">
                      <span className="item-status-label">Trạng thái combo:</span>
                      <span className={`status-badge status-${orderItem.status}`}>
                        {getItemStatusText(orderItem.status)}
                      </span>
                    </div>
                  )
                )}
                
                {/* Hiển thị combo items nếu có */}
                {orderItem.itemType === 'menu' && orderItem.comboItems && orderItem.comboItems.length > 0 && (
                  <div className="combo-items-container">
                    <div className="combo-header">
                      <span className="combo-status-label">Trạng thái từng món:</span>
                    </div>
                    <div className="combo-items-list">
                      {orderItem.comboItems.map((comboItem, index) => (
                        <div key={index} className="combo-item">
                          <span className="combo-item-name">{comboItem.itemName}</span>
                          <span className={`status-badge status-${comboItem.status}`}>
                            {getItemStatusText(comboItem.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Nút xóa món - chỉ hiển thị khi có thể sửa đổi */}
                {canEditOrder && orderItem.status === 'pending' && (
                  <button 
                    onClick={() => handleRemoveItem(orderItem._id)} 
                    className="remove-item-btn"
                  >
                    Xóa món
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <div className="action-buttons">
            {/* Chỉ hiển thị nút khi có pending changes, waiter đã từ chối, hoặc đang trong editing mode */}
            {order?.status === 'pending' && (pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0 || order?.waiterResponse?.status === 'rejected' || canEditOrder) && (
              <button 
                onClick={() => {
                  console.log('Button clicked!');
                  console.log('Pending changes:', pendingChanges);
                  console.log('Has pending changes:', pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0);
                  console.log('Order status:', order?.status);
                  
                  if (pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0) {
                    // Có thay đổi - gửi đơn hàng đã sửa đổi
                    console.log('Calling updateOrderStatus to save changes');
                    updateOrderStatus();
                  } else {
                    // Không có thay đổi - gửi lại đơn hàng cho waiter
                    console.log('Calling updateOrderStatus to resend to waiter');
                    updateOrderStatus();
                  }
                }} 
                className={`refresh-btn ${order?.waiterResponse?.status === 'pending' ? 'waiting-waiter' : ''}`}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  'Đang cập nhật...'
                ) : (pendingChanges.itemsToAdd.length > 0 || pendingChanges.itemsToRemove.length > 0) ? (
                  'Gửi lại đơn hàng cho waiter'
                ) : (
                  'Gửi lại đơn hàng cho waiter'
                )}
            </button>
            )}
            {order && order.status === 'paid' && (
              <button onClick={handleShowFeedback} className="feedback-btn">
                Đánh giá dịch vụ
              </button>
            )}
          </div>
        </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="add-item-modal">
          <div className="add-item-modal-content">
            <div className="modal-header">
              <h3>Thêm món vào đơn hàng</h3>
              <button onClick={() => setShowAddItemModal(false)} className="close-btn">✕</button>
            </div>
            
            <div className="modal-body">
              {/* Tabs */}
              <div className="modal-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'menus' ? 'active' : ''}`}
                  onClick={() => setActiveTab('menus')}
                >
                  Thực đơn
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`}
                  onClick={() => setActiveTab('items')}
                >
                  Món lẻ
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content">
                {activeTab === 'menus' && (
                  <div className="menu-grid">
                    {menus.map(menu => {
                      const isSelected = selectedItems.some(selected => 
                        selected.item._id === menu._id && selected.type === 'menu'
                      );
                      const selectedItem = selectedItems.find(selected => 
                        selected.item._id === menu._id && selected.type === 'menu'
                      );
                      
                      return (
                      <div 
                        key={menu._id} 
                          className={`menu-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => addToSelectedItems(menu, 'menu')}
                      >
                        <div className="menu-image">
                          <img src={menu.image || '/api/placeholder/300/200'} alt={menu.name} />
                        </div>
                        <div className="menu-content">
                          <h5>{menu.name}</h5>
                          <p className="menu-description">{menu.description}</p>
                          <div className="menu-price">{(menu.price || 0).toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                          
                          {/* Hiển thị trạng thái đã chọn */}
                          {isSelected && (
                            <div className="selected-indicator">
                              Đã chọn
                            </div>
                          )}
                      </div>
                      );
                    })}
                  </div>
                )}
                
                {activeTab === 'items' && (
                  <div className="item-grid">
                    {items.map(item => {
                      const isSelected = selectedItems.some(selected => 
                        selected.item._id === item._id && selected.type === 'item'
                      );
                      const selectedItem = selectedItems.find(selected => 
                        selected.item._id === item._id && selected.type === 'item'
                      );
                      
                      return (
                      <div 
                        key={item._id} 
                          className={`item-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => addToSelectedItems(item, 'item')}
                      >
                        <div className="item-image">
                          <img src={item.image || '/api/placeholder/300/200'} alt={item.name} />
                        </div>
                        <div className="item-content">
                          <h5>{item.name}</h5>
                          <p className="item-description">{item.description}</p>
                          <div className="item-price">{(item.price || 0).toLocaleString('vi-VN')} VNĐ</div>
                        </div>
                          
                          {/* Hiển thị trạng thái đã chọn */}
                          {isSelected && (
                            <div className="selected-indicator">
                              Đã chọn
                            </div>
                          )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Danh sách món đã chọn */}
              {selectedItems.length > 0 && (
                <div className="selected-items-section">
                  <h4>📋 Món đã chọn ({selectedItems.length} món)</h4>
                  <div className="selected-items-list">
                    {selectedItems.map((selected, index) => (
                      <div key={`${selected.item._id}-${selected.type}`} className="selected-item-card">
                        <img src={selected.item.image || '/api/placeholder/60/60'} alt={selected.item.name} />
                      <div className="selected-item-details">
                          <h6>{selected.item.name}</h6>
                          <p>{(selected.item.price || 0).toLocaleString('vi-VN')} VNĐ</p>
                          <div className="selected-item-note-section">
                            <label>Ghi chú:</label>
                            <textarea
                              value={selected.note}
                              onChange={(e) => updateSelectedItemNote(selected.item._id, selected.type, e.target.value)}
                              placeholder="VD: Ít cay, không hành..."
                              rows={2}
                              className="selected-note-textarea"
                            />
                      </div>
                    </div>
                        <div className="selected-item-controls">
                          <div className="selected-quantity">
                  <label>Số lượng:</label>
                  <div className="quantity-buttons">
                              <button onClick={() => updateSelectedItemQuantity(selected.item._id, selected.type, selected.quantity - 1)}>-</button>
                              <span>{selected.quantity}</span>
                              <button onClick={() => updateSelectedItemQuantity(selected.item._id, selected.type, selected.quantity + 1)}>+</button>
                  </div>
                </div>
                          <button 
                            onClick={() => removeFromSelectedItems(selected.item._id, selected.type)}
                            className="remove-selected-item-btn"
                          >
                            🗑️ Xóa
                          </button>
                  </div>
                </div>
                    ))}
                  </div>
                  <div className="selected-items-total">
                    <strong>Tổng: {selectedItems.reduce((sum, selected) => sum + ((selected.item.price || 0) * (selected.quantity || 0)), 0).toLocaleString('vi-VN')} VNĐ</strong>
              </div>
            </div>
              )}
                </div>
                
            
            <div className="modal-footer">
              <button onClick={() => setShowAddItemModal(false)} className="cancel-btn">
                Hủy
              </button>
              {selectedItems.length > 0 && (
                <button onClick={handleAddSelectedItemsToOrder} className="confirm-btn">
                  Thêm {selectedItems.length} món vào đơn hàng
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="feedback-modal">
          <div className="feedback-modal-content">
            <div className="feedback-modal-header">
              <h3>Đánh giá dịch vụ</h3>
              <button 
                onClick={() => setShowFeedbackModal(false)} 
                className="close-feedback-btn"
              >
                ×
              </button>
            </div>
            <div className="feedback-modal-body">
              <FeedbackForm 
                orderId={orderId}
                onFeedbackSubmitted={handleFeedbackSubmitted}
              />
            </div>
          </div>
        </div>
      )}

      {/* Waiter Response Popup Modal - Only show if order is not cancelled */}
      {showWaiterResponseModal && waiterResponseData && order?.status !== 'cancelled' && (
        <div className="modal-overlay">
          <div className="waiter-response-modal">
            <div className="modal-header">
              {waiterResponseData.type === 'rejected' ? (
                <h3>Đơn hàng bị từ chối</h3>
              ) : (
                <h3>Nhân viên đã xác nhận đơn hàng</h3>
              )}
              <button 
                onClick={() => setShowWaiterResponseModal(false)} 
                className="close-modal-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {waiterResponseData.type === 'rejected' ? (
                <div>
                  <p><strong>Lý do từ chối:</strong> {waiterResponseData.reason}</p>
                  <p>Bạn có thể sửa đổi đơn hàng và gửi lại yêu cầu.</p>
                </div>
              ) : (
                <div>
                  <p>Nhân viên đã xác nhận đơn hàng của bạn.</p>
                  {waiterResponseData.tableNumber && (
                    <p><strong>Bàn của bạn: {waiterResponseData.tableNumber}</strong></p>
                  )}
                  {waiterResponseData.servedBy && (
                    <p><strong>Nhân viên phục vụ: {waiterResponseData.servedBy}</strong></p>
                  )}
                  <p>Vui lòng kiểm tra lại và xác nhận để gửi xuống bếp.</p>
                  
                  {/* Hiển thị chi tiết đơn hàng */}
                  <div className="order-review-section">
                    <h4>📋 Chi tiết đơn hàng:</h4>
                    <div className="order-items-review">
                      {order?.orderItems?.map((orderItem) => (
                        <div key={orderItem._id} className="review-item">
                          <div className="item-info">
                            <span className="item-name">{orderItem.itemName}</span>
                            <span className="item-price">{(orderItem.price || 0).toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                          <div className="item-details">
                            <span className="item-quantity">Số lượng: {orderItem.quantity}</span>
                            <span className="item-type">Loại: {orderItem.itemType}</span>
                            {orderItem.note && (
                              <span className="item-note">Ghi chú: {orderItem.note}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="order-total-review">
                      <strong>Tổng tiền: {((calculatedTotalAmount || order?.totalAmount) || 0).toLocaleString('vi-VN')} VNĐ</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {waiterResponseData.type === 'rejected' ? (
                <button 
                  onClick={handleStartEditOrder}
                  className="edit-order-btn"
                >
                  ✏️ Sửa đổi đơn hàng
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleConfirmOrder} 
                    className="confirm-order-btn"
                  >
                    ✓ Xác nhận đơn hàng
                  </button>
                  <button 
                    onClick={handleStartEditOrder}
                    className="edit-order-btn"
                  >
                    ✏️ Sửa đổi đơn hàng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
});

export default OrderStatus;