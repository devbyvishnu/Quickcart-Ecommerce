import { inngest } from "@/config/inngest";
import Product from "@/models/Product";
import User from "@/models/User";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    const { address, items } = await request.json();

    if (!address || items.length === 0) {
      return NextResponse.json({ success: false, message: "Invalid data" });
    }

    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ success: false, message: "Product not found" });
      }
      amount += product.offerPrice * item.quantity;
    }

    const tax = Math.floor(amount * 0.02);
    const totalAmount = amount + tax;

    await inngest.send({
      name: 'order/created',
      data: {
        userId,
        address,
        items,
        amount: totalAmount,
        date: Date.now(),
      },
    });

    const user = await User.findOne({ clerkId: userId }); // <- update if you're using Clerk userId
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" });
    }

    user.cartItems = {};
    await user.save();

    return NextResponse.json({ success: true, message: "Order-Placed" });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: error.message });
  }
}
